/**
 * @file ai.ts
 * @description AI service wrapper using ChatOpenAI with semantic caching for unit test prompts.
 */
import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import { RunnableLambda } from "@langchain/core/runnables";
import OpenAI from "openai";
import { AiSemanticCacheRedis } from "@/app/lib/services/aiSemanticCacheRedis.server";
import { configService } from "@/app/lib/services/config/configService.server";

const semanticCache = new AiSemanticCacheRedis();


export async function aiUnitTest(prompt: string) {
	console.log("Hi")
	const trimmedPrompt = prompt?.trim();
	if (!trimmedPrompt) {
		throw new Error("Prompt is required.");
	}

	const apiKey = await configService.getOpenAiApiKey();
	if (!apiKey) {
		throw new Error("OpenAI API key not found. Please add one in Settings.");
	}

	// Semantic cache (RedisSearch vector KNN). If Redis isn't configured/available, this is a no-op.
	const cacheDomain = "aiUnitTest";
	const cacheVersion = "gpt-5 nano";
	// const cached = await semanticCache.lookupText(trimmedPrompt, cacheDomain, cacheVersion, apiKey);
	// if (cached) return cached;

	const llm = new ChatOpenAI({
		apiKey: apiKey,
		model: "gpt-4.1",
	});

	console.log("completion is start");
	const completion = await llm.invoke(trimmedPrompt);
	console.log("completion is end");

	// Chat models return a message object; normalize to a string for callers.
	if (typeof completion === "string") {
		void semanticCache.writeText(trimmedPrompt, completion, cacheDomain, cacheVersion, apiKey);
		return completion;
	}
	const content: unknown = (completion as { content?: unknown })?.content;
	if (typeof content === "string") {
		void semanticCache.writeText(trimmedPrompt, content, cacheDomain, cacheVersion, apiKey);
		return content;
	}
	const fallback = JSON.stringify(content ?? completion);
	void semanticCache.writeText(trimmedPrompt, fallback, cacheDomain, cacheVersion, apiKey);
	return fallback;
}

type AnalyzeImageInput = {
	base64Image: string;
	mimeType?: string;
	question?: string;
};

const analyzeImageChain = RunnableLambda.from(async (input: AnalyzeImageInput) => {
	const apiKey = await configService.getOpenAiApiKey();
	if (!apiKey) {
		throw new Error("OpenAI API key not found. Please add one in Settings.");
	}

	const openai = new OpenAI({ apiKey });
	const mime = input.mimeType || "image/jpeg";

	const response = await openai.responses.create({
		model: "gpt-4.1",
		input: [
			{
				role: "user",
				content: [
					{ type: "input_text", text: input.question || "What is in this image?" },
					{
						type: "input_image",
						image_url: `data:${mime};base64,${input.base64Image}`,
						detail: "auto",
					},
				],
			},
		],
	});

	return response.output_text;
});

export async function aiAnalyzeImage(
	base64Image: string,
	mimeType?: string,
	question?: string,
): Promise<string> {
	return analyzeImageChain.invoke({ base64Image, mimeType, question });
}

export async function aiExtractCodeContext(codes: string[]): Promise<string> {
	const joined = codes.join("\n\n---\n\n");
	if (!joined.trim()) {
		throw new Error("No code provided.");
	}

	const apiKey = await configService.getOpenAiApiKey();
	if (!apiKey) {
		throw new Error("OpenAI API key not found. Please add one in Settings.");
	}

	const openai = new OpenAI({ apiKey });

	const prompt = `You are a Frontend Developer preparing technical context
for a QA team to write Playwright E2E tests.

From the code below, extract the following:

1. **Page Routes/URLs**: every route path involved in this feature
2. **Selectors Map**: every element the user can interact with
   - Use Playwright-preferred selector priority:
     selector ID > role + name > label > CSS selector
   - Format: { elementName, selector ID, action, action ID: click/fill/select/etc }
   - Format constraint: get and provide all ID that has respond
4. **UI States & Conditions**: conditions that change the UI
   (loading, error, empty, success, disabled states)
5. **Form Validations**: all validation rules
   (required, min/max, pattern, custom validators)
6. **Navigation Flow**: any redirects or page transitions triggered
   by user actions

Code:
${joined}`;

	const response = await openai.responses.create({
		model: "gpt-5-codex",
		input: [{ role: "user", content: prompt }],
	});

	return response.output_text;
}

const HTML_TO_MD_MAX_CHARS = 100_000;

/**
 * Converts Azure DevOps work item HTML (description) to Markdown via LLM.
 */
export async function HtmlToMarkdown(html: string, workItemTitle: string, workItemId: number): Promise<string> {
	const apiKey = await configService.getOpenAiApiKey();
	if (!apiKey) {
		throw new Error("OpenAI API key not found. Please add one in Settings.");
	}

	const trimmed = (html ?? "").trim();
	const body =
		trimmed.length > HTML_TO_MD_MAX_CHARS
			? `${trimmed.slice(0, HTML_TO_MD_MAX_CHARS)}\n\n<!-- truncated: description exceeded ${HTML_TO_MD_MAX_CHARS} characters -->`
			: trimmed;

	const llm = new ChatOpenAI({
		apiKey,
		model: "gpt-4.1",
	});

	const prompt = `Convert the following HTML (from an Azure DevOps work item) into clean, readable Markdown.

Work item: #${workItemId} — ${workItemTitle || "(no title)"}

Rules:
- Preserve structure: headings, lists, numbered steps, tables, and links when possible.
- For images, keep src paths that start with /upload/ as Markdown images using the same path (e.g. ![alt](/upload/...)).
- Use a single top-level title if appropriate; otherwise start with body content.
- Do not wrap the entire output in a markdown code fence.
- Output Markdown only — no preamble or explanation.

HTML:
${body || "<p>(empty description)</p>"}`;

	const completion = await llm.invoke(prompt);
	if (typeof completion === "string") return completion;
	const content: unknown = (completion as { content?: unknown })?.content;
	if (typeof content === "string") return content;
	return JSON.stringify(content ?? completion);
}

