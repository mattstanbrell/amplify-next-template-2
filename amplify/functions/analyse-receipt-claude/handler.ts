import { env } from "$amplify/env/analyse-receipt-claude";
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "../shared/types";
import { SYSTEM_PROMPT } from "../shared/types";
import type { Handler } from "aws-lambda";

interface RequestEvent {
	body: string;
	headers: {
		"content-type"?: string;
	};
}

export const handler: Handler = async (event: RequestEvent) => {
	try {
		const base64Data = event.body;
		console.log("Sending to Claude...");
		const startTime = Date.now();

		const anthropic = new Anthropic({
			apiKey: env.ANTHROPIC_API_KEY,
		});

		const response = await anthropic.messages.create({
			model: "claude-3-haiku-20240307",
			max_tokens: 100,
			temperature: 0.1,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: SYSTEM_PROMPT,
						},
						{
							type: "image",
							source: {
								type: "base64",
								media_type: "image/jpeg",
								data: base64Data,
							},
						},
					],
				},
			],
		});

		console.log("Claude response:", response);

		// Get the first text block from the response
		let total = "";
		for (const block of response.content) {
			if (block.type === "text") {
				total = block.text.trim();
				break;
			}
		}

		if (!total) {
			throw new Error("No text content in response");
		}

		const timeTaken = Date.now() - startTime;
		const inputTokens = response.usage.input_tokens;
		const outputTokens = response.usage.output_tokens;
		const cost = (inputTokens * 0.25 + outputTokens * 1.25) / 1_000_000; // $0.25/MTok input, $1.25/MTok output

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
		console.error("Claude analysis error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			}),
		};
	}
};
