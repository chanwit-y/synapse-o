/**
 * @file ai.ts
 * @description AI service wrapper using ChatOpenAI with semantic caching for unit test prompts.
 */
import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import { AiSemanticCacheRedis } from "@/app/lib/services/aiSemanticCacheRedis.server";
import { configService } from "@/app/lib/services/config/configService.server";

const semanticCache = new AiSemanticCacheRedis();


export async function aiUnitTest(prompt: string) {
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
	const cached = await semanticCache.lookupText(trimmedPrompt, cacheDomain, cacheVersion, apiKey);
	if (cached) return cached;

	const llm = new ChatOpenAI({
		apiKey: apiKey,
		model: "gpt-4.1",
	});
	const completion = await llm.invoke(trimmedPrompt);

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

