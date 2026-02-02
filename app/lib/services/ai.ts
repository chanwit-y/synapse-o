import { ChatOpenAI } from "@langchain/openai";
import { ApiKeyRepository } from "../db/repository/api-key";

const apiKeyRepo = new ApiKeyRepository();


export async function aiUnitTest(prompt: string) {
	const trimmedPrompt = prompt?.trim();
	if (!trimmedPrompt) {
		throw new Error("Prompt is required.");
	}

	const apiKey = (await apiKeyRepo.findAll())?.[0]?.apiKey;
	if (!apiKey) {
		throw new Error("OpenAI API key not found. Please add one in Settings.");
	}

	const llm = new ChatOpenAI({
		apiKey: apiKey,
		model: "gpt-4.1",
	});
	const completion = await llm.invoke(trimmedPrompt);

	// Chat models return a message object; normalize to a string for callers.
	if (typeof completion === "string") return completion;
	const content: unknown = (completion as { content?: unknown })?.content;
	if (typeof content === "string") return content;
	return JSON.stringify(content ?? completion);
}

