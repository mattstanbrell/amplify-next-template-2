import { env } from "$amplify/env/analyse-receipt-gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AnalysisResult } from "../shared/types";
import { SYSTEM_PROMPT } from "../shared/types";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
	model: "gemini-2.0-flash-exp",
	generationConfig: {
		temperature: 0.1,
		maxOutputTokens: 1024,
	},
});

interface RequestEvent {
	body: string;
	headers: {
		"content-type"?: string;
	};
}

export const handler = async (event: RequestEvent) => {
	try {
		const base64Data = event.body;
		const mimeType = event.headers["content-type"] || "image/jpeg";

		console.log("Sending to Gemini...");
		const startTime = Date.now();

		const result = await model.generateContent([
			{
				inlineData: {
					data: base64Data,
					mimeType,
				},
			},
			SYSTEM_PROMPT,
		]);

		const response = await result.response;
		const total = response.text().trim();
		const timeTaken = Date.now() - startTime;

		const metadata = response.usageMetadata;
		const inputTokens = metadata?.promptTokenCount ?? 258;
		const outputTokens =
			metadata?.candidatesTokenCount ?? Math.ceil(total.length / 4);

		return {
			statusCode: 200,
			body: JSON.stringify({
				total,
				timeTaken,
				cost: -2, // Free tier (15 RPM)
				tokenInfo: {
					inputTokens,
					outputTokens,
				},
			} as AnalysisResult),
		};
	} catch (error: unknown) {
		console.error("Gemini analysis error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
			}),
		};
	}
};
