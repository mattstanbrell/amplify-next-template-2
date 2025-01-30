import { env } from "$amplify/env/analyse-receipt-qwen7b";
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
		const base64Data = event.body;
		console.log("Sending to Qwen 7B...");
		const startTime = Date.now();

		const response = await fetch(
			"https://api.hyperbolic.xyz/v1/chat/completions",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.HYPERBOLIC_API_KEY}`,
				},
				body: JSON.stringify({
					model: "Qwen/Qwen2-VL-7B-Instruct",
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
									image_url: { url: `data:image/jpeg;base64,${base64Data}` },
								},
							],
						},
					],
					max_tokens: 100,
					temperature: 0.1,
					stream: false,
				}),
			},
		);

		const json = await response.json();
		console.log("Qwen 7B response:", {
			content: json.choices[0].message.content,
			usage: json.usage,
			raw: json,
		});

		const total = json.choices[0].message.content.trim();
		const timeTaken = Date.now() - startTime;
		const totalTokens = json.usage.total_tokens;
		const cost = (totalTokens / 1_000_000) * 0.1; // $0.1 per 1M tokens

		return {
			statusCode: 200,
			body: JSON.stringify({
				total,
				timeTaken,
				cost,
				tokenInfo: {
					inputTokens: json.usage.prompt_tokens,
					outputTokens: json.usage.completion_tokens,
				},
			} as AnalysisResult),
		};
	} catch (error: unknown) {
		console.error("Qwen 7B analysis error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			}),
		};
	}
};
