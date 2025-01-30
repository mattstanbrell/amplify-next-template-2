import { env } from "$amplify/env/analyse-receipt-gpt4";
import OpenAI from "openai";
import type { AnalysisResult } from "../shared/types";
import { SYSTEM_PROMPT } from "../shared/types";

interface RequestEvent {
	body: string;
	headers: {
		"content-type"?: string;
	};
}

export const handler = async (event: RequestEvent) => {
	try {
		const OPENAI_API_KEY = env.OPENAI_API_KEY;
		const base64Data = event.body;
		console.log("Sending to GPT-4...");
		const startTime = Date.now();

		const openai = new OpenAI({
			apiKey: OPENAI_API_KEY,
		});

		const response = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: [
						{
							type: "image_url",
							image_url: {
								url: `data:image/jpeg;base64,${base64Data}`,
							},
						},
					],
				},
			],
			max_tokens: 100,
			temperature: 0.1,
		});

		console.log("GPT-4 response:", response);

		const total = response.choices[0].message.content?.trim() || "";
		const timeTaken = Date.now() - startTime;
		const inputTokens = response.usage?.prompt_tokens || 0;
		const outputTokens = response.usage?.completion_tokens || 0;
		const cost = 0.004; // Hardcoded cost for gpt-4o-mini

		return {
			statusCode: 200,
			body: JSON.stringify({
				total,
				timeTaken,
				cost,
				tokenInfo: {
					inputTokens,
					outputTokens,
				},
			} as AnalysisResult),
		};
	} catch (error: unknown) {
		console.error("GPT-4 analysis error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			}),
		};
	}
};
