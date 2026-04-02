import { useCallback, useMemo, useRef } from "react";
import { useEdges, useNodes, useReactFlow } from "@xyflow/react";
import {
  DEFAULT_EXPRESSION_CONFIG,
  type ExpressionConfig,
  type Variable,
} from "./types";
import { getUpstreamVariablesForNode, VariableInsertDropdown } from "./ApiBody";

const EXPRESSION_OPERATORS = ["+", "-", "*", "/", "%", "(", ")"] as const;

/** Allowed: numbers, identifiers, whitespace, operators, parens, decimal point. */
const EXPR_CHAR_RE = /[0-9a-zA-Z_\s+\-*/%.()]/;

function validateArithmeticExpression(expr: string): string[] {
  const errors: string[] = [];
  const trimmed = expr.trim();

  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (!EXPR_CHAR_RE.test(c)) {
      errors.push(`Invalid character “${c}” at position ${i + 1}.`);
      break;
    }
  }

  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth < 0) {
        errors.push("Unexpected “)”—parentheses are not balanced.");
        return errors;
      }
    }
  }
  if (depth > 0) {
    errors.push("Unclosed “(”—parentheses are not balanced.");
  }

  if (trimmed.length === 0 && expr.length > 0) {
    errors.push("Expression cannot be only whitespace.");
  }

  return errors;
}

function validateTargetVariableName(name: string): string | null {
  const t = name.trim();
  if (t.length === 0) return null;
  if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(t)) {
    return "Use a valid name: letters, digits, underscore; must start with a letter, _, or $.";
  }
  return null;
}

/** Identifiers in the expression (excludes numeric literals). */
function extractExpressionIdentifiers(expr: string): string[] {
  const ids = new Set<string>();
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      i++;
      while (i < expr.length && /[0-9]/.test(expr[i] ?? "")) i++;
      if (expr[i] === ".") {
        i++;
        while (i < expr.length && /[0-9]/.test(expr[i] ?? "")) i++;
      }
      if (expr[i] === "e" || expr[i] === "E") {
        i++;
        if (expr[i] === "+" || expr[i] === "-") i++;
        while (i < expr.length && /[0-9]/.test(expr[i] ?? "")) i++;
      }
      continue;
    }
    if (c === "." && /[0-9]/.test(expr[i + 1] ?? "")) {
      i++;
      while (i < expr.length && /[0-9]/.test(expr[i] ?? "")) i++;
      if (expr[i] === "e" || expr[i] === "E") {
        i++;
        if (expr[i] === "+" || expr[i] === "-") i++;
        while (i < expr.length && /[0-9]/.test(expr[i] ?? "")) i++;
      }
      continue;
    }
    if (/[a-zA-Z_$]/.test(c)) {
      const start = i;
      i++;
      while (i < expr.length && /[a-zA-Z0-9_$]/.test(expr[i] ?? "")) i++;
      ids.add(expr.slice(start, i));
      continue;
    }
    i++;
  }
  return [...ids];
}

function findUpstreamVariable(name: string, upstream: Variable[]): Variable | undefined {
  const n = name.trim();
  if (!n) return undefined;
  return upstream.find((v) => v.name.trim() === n);
}

function validateExpressionReferences(
  expr: string,
  upstream: Variable[],
  options: { skipBecauseInvalidChars: boolean },
): string[] {
  if (options.skipBecauseInvalidChars) return [];
  const trimmed = expr.trim();
  if (trimmed.length === 0) return [];

  const ids = extractExpressionIdentifiers(expr);
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);

    const v = findUpstreamVariable(id, upstream);
    if (!v) {
      errors.push(
        `Unknown variable “${id}”. Connect an input, variable, or expression node above that defines it.`,
      );
      continue;
    }
    if (v.dataType !== "number") {
      errors.push(
        `Variable “${id}” has type ${v.dataType}; arithmetic expressions expect number.`,
      );
    }
  }

  return errors;
}

function validateExpressionFull(
  expr: string,
  upstream: Variable[],
): string[] {
  const structural = validateArithmeticExpression(expr);
  const skipRefs = structural.some((m) => m.startsWith("Invalid character"));
  const refErrors = validateExpressionReferences(expr, upstream, {
    skipBecauseInvalidChars: skipRefs,
  });
  return [...structural, ...refErrors];
}

export function ExpressionBody({
  nodeId,
  config,
  isDark,
}: {
  nodeId: string;
  config: ExpressionConfig;
  isDark: boolean;
}) {
  const { setNodes } = useReactFlow();
  const nodes = useNodes();
  const edges = useEdges();
  const exprRef = useRef<HTMLTextAreaElement>(null);

  const upstreamVariables = useMemo(
    () => getUpstreamVariablesForNode(nodeId, () => nodes, () => edges),
    [nodeId, nodes, edges],
  );

  const patchConfig = useCallback(
    (partial: Partial<ExpressionConfig>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const prev =
            (n.data.expressionConfig as ExpressionConfig | undefined) ??
            { ...DEFAULT_EXPRESSION_CONFIG };
          return {
            ...n,
            data: { ...n.data, expressionConfig: { ...prev, ...partial } },
          };
        }),
      );
    },
    [nodeId, setNodes],
  );

  const insertAtCursor = useCallback(
    (text: string) => {
      const el = exprRef.current;
      const value = config.expression;
      if (!el) {
        patchConfig({ expression: value + text });
        return;
      }
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      patchConfig({ expression: next });
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      });
    },
    [config.expression, patchConfig],
  );

  const insertVariable = useCallback(
    (variableName: string) => {
      if (!variableName.trim()) return;
      insertAtCursor(variableName.trim());
    },
    [insertAtCursor],
  );

  const { exprErrors, nameError, completenessHint } = useMemo(() => {
    const exprErrors = validateExpressionFull(config.expression, upstreamVariables);
    const nameError = validateTargetVariableName(config.targetVariableName);
    const exprTrim = config.expression.trim();
    const nameTrim = config.targetVariableName.trim();
    let completenessHint: string | null = null;
    if (nameTrim.length > 0 && exprTrim.length === 0) {
      completenessHint = "Add an expression for this variable.";
    } else if (exprTrim.length > 0 && nameTrim.length === 0) {
      completenessHint = "Set a variable name for the result.";
    }
    return { exprErrors, nameError, completenessHint };
  }, [config.expression, config.targetVariableName, upstreamVariables]);

  const hasExprIssue = exprErrors.length > 0;
  const hasNameIssue = nameError != null;
  const showHint = completenessHint != null && !hasExprIssue && !hasNameIssue;

  const fieldClass = [
    "nodrag nowheel w-full min-w-0 rounded border px-2 py-1 text-[11px] outline-none",
    isDark
      ? "border-gray-600 bg-gray-900/40 text-gray-200 placeholder:text-gray-500"
      : "border-gray-200 bg-white text-gray-800 placeholder:text-gray-400",
  ].join(" ");

  const borderInvalid = isDark ? "!border-red-500/80" : "!border-red-500";
  const nameFieldClass = [fieldClass, hasNameIssue ? borderInvalid : ""].filter(Boolean).join(" ");
  const exprFieldClass = [
    fieldClass,
    hasExprIssue ? borderInvalid : "",
    "resize-y min-h-[72px] font-mono",
  ]
    .filter(Boolean)
    .join(" ");

  const labelClass = isDark ? "text-gray-400" : "text-gray-500";
  const errClass = isDark ? "text-red-400" : "text-red-600";
  const hintClass = isDark ? "text-amber-400/90" : "text-amber-700";

  const opBtnClass = [
    "nodrag nowheel shrink-0 rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold leading-none transition-colors",
    isDark
      ? "border border-gray-600 bg-gray-700/60 text-gray-200 hover:bg-gray-600/80"
      : "border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100",
  ].join(" ");

  return (
    <div className="flex flex-col gap-2 min-w-[200px]">
      <div className="flex flex-col gap-0.5">
        <label
          className={["text-[10px] font-medium uppercase tracking-wide", labelClass].join(" ")}
        >
          Variable name
        </label>
        <input
          type="text"
          value={config.targetVariableName}
          onChange={(e) => patchConfig({ targetVariableName: e.target.value })}
          placeholder="result"
          className={nameFieldClass}
          aria-invalid={hasNameIssue}
        />
        {nameError ? (
          <p className={["text-[10px] leading-snug", errClass].join(" ")} role="alert">
            {nameError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <label
            className={["text-[10px] font-medium uppercase tracking-wide shrink-0", labelClass].join(
              " ",
            )}
          >
            Expression
          </label>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {EXPRESSION_OPERATORS.map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => insertAtCursor(op)}
                className={opBtnClass}
                title={`Insert ${op}`}
              >
                {op}
              </button>
            ))}
            <VariableInsertDropdown
              nodeId={nodeId}
              isDark={isDark}
              onPick={insertVariable}
            />
          </div>
        </div>
        <textarea
          ref={exprRef}
          value={config.expression}
          onChange={(e) => patchConfig({ expression: e.target.value })}
          placeholder="e.g. a + b * (c + 1)"
          rows={4}
          className={exprFieldClass}
          aria-invalid={hasExprIssue}
        />
        {hasExprIssue ? (
          <ul className={["text-[10px] leading-snug list-disc pl-4 space-y-0.5", errClass].join(" ")} role="alert">
            {exprErrors.map((msg, idx) => (
              <li key={`${idx}-${msg}`}>{msg}</li>
            ))}
          </ul>
        ) : showHint ? (
          <p className={["text-[10px] leading-snug", hintClass].join(" ")}>{completenessHint}</p>
        ) : null}
      </div>
    </div>
  );
}
