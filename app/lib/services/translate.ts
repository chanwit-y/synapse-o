/**
 * @file translate.ts
 * @description Markdown translation helpers (English -> Thai) using OpenAI.
 */
import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import { configService } from "@/app/lib/services/config/configService.server";

/** Fixed model for Markdown EN → TH translation (not configurable via API). */
const TRANSLATE_MODEL = "gpt-4o";

/**
 * Translate Markdown text from English to Thai while preserving Markdown structure.
 *
 * - Keeps Markdown syntax intact (headings, lists, code fences, links, tables).
 * - Does not translate code blocks / inline code.
 */
export async function translateMarkdownEnglishToThai(
    markdown: string
): Promise<string> {
    const input = markdown?.trimEnd() ?? "";
    if (!input.trim()) return "";

    const apiKey = await configService.getOpenAiApiKey();
    console.log("apiKey", apiKey);
    if (!apiKey) {
        throw new Error("OpenAI API key not found. Please add one in Settings.");
    }

    const llm = new ChatOpenAI({
        apiKey,
        model: TRANSLATE_MODEL,
        temperature: 0,
    });

    const prompt = [
        "You are a professional technical translator.",
        "Task: Translate the following Markdown from English to Thai.",
        "",
        "Rules (critical):",
        "- DO NOT change any Markdown syntax tokens. Keep them exactly as-is.",
        "  Examples of tokens to keep unchanged: #, ##, >, -, *, +, 1., [], (), ![], **, __, _, ~~, ---.",
        "- Do NOT translate text inside Markdown emphasis/formatting markers. Keep the enclosed text verbatim:",
        "  - **like this**",
        "  - __like this__",
        "  - *like this*",
        "  - _like this_",
        "  - ~~like this~~",
        "- Preserve structure and whitespace: headings, lists/indentation, blockquotes, tables, and blank lines.",
        "- Do NOT translate anything inside code blocks (```...```) or inline code (`...`).",
        "- Keep URLs unchanged (the part inside parentheses in links/images).",
        "- Keep HTML tags unchanged if present (e.g. <br>, <kbd>, <sup>).",
        "- Keep product names / proper nouns unchanged unless they have a common Thai name.",
        "- Output ONLY the translated Markdown. No extra explanations, no quotes.",
        "",
        "Markdown input:",
        input,
    ].join("\n");

    const completion = await llm.invoke(prompt);

    if (typeof completion === "string") return completion;
    const content: unknown = (completion as { content?: unknown })?.content;
    if (typeof content === "string") return content;
    return JSON.stringify(content ?? completion);
}

