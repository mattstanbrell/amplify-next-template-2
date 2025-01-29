import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import convert from "heic-convert";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

if (!process.env.GEMINI_API_KEY) {
	throw new Error("GEMINI_API_KEY environment variable is not set");
}

if (!process.env.HYPERBOLIC_API_KEY) {
	throw new Error("HYPERBOLIC_API_KEY environment variable is not set");
}

if (!process.env.ANTHROPIC_API_KEY) {
	throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const anthropic = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY,
});
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

// Supported MIME types by Gemini (removing HEIC/HEIF as they're not actually supported)
const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

// HEIC/HEIF types that we'll convert
const CONVERTIBLE_TYPES = ["image/heic", "image/heif"];

// Maximum file size (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

const model = genAI.getGenerativeModel({
	model: "gemini-2.0-flash-exp",
	generationConfig: {
		temperature: 0.1,
		maxOutputTokens: 1024,
	},
});

const SYSTEM_PROMPT =
	"Analyze this receipt image. Find and return ONLY the total amount paid, formatted as £XX.XX (for example £82.56). Return ONLY the amount, no other text or explanation.";

type AnalysisResult = {
	total: string;
	timeTaken: number;
	cost: number;
	tokenInfo?: {
		inputTokens: number;
		outputTokens: number;
	};
};

type AnalysisError = {
	error: string;
};

type ModelResult = AnalysisResult | AnalysisError;

const requestCache = new Map<string, Promise<ModelResult>>();

async function convertHeicToJpeg(
	buffer: Buffer,
): Promise<{ data: Buffer; mimeType: string }> {
	try {
		const jpegBuffer = await convert({
			buffer: buffer as unknown as ArrayBuffer,
			format: "JPEG",
			quality: 0.9,
		});
		return { data: Buffer.from(jpegBuffer), mimeType: "image/jpeg" };
	} catch (error) {
		console.error("Error converting HEIC to JPEG:", error);
		throw new Error("Failed to convert HEIC image");
	}
}

async function analyzeWithGemini(
	base64Data: string,
	mimeType: string,
): Promise<ModelResult> {
	const cacheKey = `gemini-${base64Data.slice(0, 100)}`;
	const cached = requestCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	console.log("Sending to Gemini...");
	const startTime = Date.now();

	const promise = model
		.generateContent([
			{
				inlineData: {
					data: base64Data,
					mimeType,
				},
			},
			SYSTEM_PROMPT,
		])
		.then(async (result) => {
			const response = await result.response;
			const total = response.text().trim();
			console.log("Gemini response:", { total });
			const timeTaken = Date.now() - startTime;

			// Get token usage from response metadata
			// Image is always 258 tokens
			// System prompt is counted in promptTokens
			const metadata = response.usageMetadata;
			const inputTokens = metadata?.promptTokenCount ?? 258; // Fallback to just image tokens if metadata unavailable
			const outputTokens =
				metadata?.candidatesTokenCount ?? Math.ceil(total.length / 4);

			return {
				total,
				timeTaken,
				cost: -2, // Free tier (15 RPM)
				tokenInfo: {
					inputTokens,
					outputTokens,
				},
			};
		});

	requestCache.set(cacheKey, promise);
	return promise;
}

async function analyzeWithQwen72B(base64Data: string): Promise<ModelResult> {
	const cacheKey = `qwen72b-${base64Data.slice(0, 100)}`;
	const cached = requestCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	console.log("Sending to Qwen 72B...");
	const startTime = Date.now();

	const promise = fetch("https://api.hyperbolic.xyz/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
		},
		body: JSON.stringify({
			model: "Qwen/Qwen2-VL-72B-Instruct",
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
	})
		.then((response) => response.json())
		.then((json) => {
			console.log("Qwen 72B response:", {
				content: json.choices[0].message.content,
				usage: json.usage,
				raw: json,
			});
			const total = json.choices[0].message.content.trim();
			const timeTaken = Date.now() - startTime;
			const totalTokens = json.usage.total_tokens;
			const cost = (totalTokens / 1_000_000) * 0.4; // $0.4 per 1M tokens
			return {
				total,
				timeTaken,
				cost,
				tokenInfo: {
					inputTokens: json.usage.prompt_tokens,
					outputTokens: json.usage.completion_tokens,
				},
			};
		});

	requestCache.set(cacheKey, promise);
	return promise;
}

async function analyzeWithQwen7B(base64Data: string): Promise<ModelResult> {
	const cacheKey = `qwen7b-${base64Data.slice(0, 100)}`;
	const cached = requestCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	console.log("Sending to Qwen 7B...");
	const startTime = Date.now();

	const promise = fetch("https://api.hyperbolic.xyz/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${process.env.HYPERBOLIC_API_KEY}`,
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
	})
		.then((response) => response.json())
		.then((json) => {
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
				total,
				timeTaken,
				cost,
				tokenInfo: {
					inputTokens: json.usage.prompt_tokens,
					outputTokens: json.usage.completion_tokens,
				},
			};
		});

	requestCache.set(cacheKey, promise);
	return promise;
}

async function analyzeWithClaude(
	base64Data: string,
	mimeType: string,
): Promise<ModelResult> {
	const cacheKey = `claude-${base64Data.slice(0, 100)}`;
	const cached = requestCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	console.log("Sending to Claude 3 Haiku...");
	const startTime = Date.now();

	// Ensure mimeType is one of the supported types
	const supportedMimeTypes = [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/gif",
	] as const;
	const validMimeType =
		supportedMimeTypes.find((type) => type === mimeType) ?? "image/jpeg";

	const promise = anthropic.messages
		.create({
			model: "claude-3-haiku-20240307",
			max_tokens: 100,
			temperature: 0.1,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image",
							source: {
								type: "base64",
								media_type: validMimeType,
								data: base64Data,
							},
						},
					],
				},
			],
		})
		.then((msg) => {
			const textContent = msg.content.find((block) => block.type === "text");
			console.log("Claude Haiku response:", {
				content: textContent?.text,
				usage: msg.usage,
				raw: msg,
			});
			if (!textContent || textContent.type !== "text") {
				throw new Error("Unexpected response format from Claude");
			}
			const total = textContent.text.trim();
			const timeTaken = Date.now() - startTime;

			// Calculate cost based on input and output tokens
			const inputCost = (msg.usage.input_tokens / 1_000_000) * 0.25; // $0.25/MTok input
			const outputCost = (msg.usage.output_tokens / 1_000_000) * 1.25; // $1.25/MTok output
			const totalCost = inputCost + outputCost;

			return {
				total,
				timeTaken,
				cost: totalCost,
				tokenInfo: {
					inputTokens: msg.usage.input_tokens,
					outputTokens: msg.usage.output_tokens,
				},
			};
		});

	requestCache.set(cacheKey, promise);
	return promise;
}

/*
async function analyzeWithClaudeSonnet(
	base64Data: string,
	mimeType: string,
): Promise<ModelResult> {
	const cacheKey = `claude-sonnet-${base64Data.slice(0, 100)}`;
	const cached = requestCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	console.log("Sending to Claude 3.5 Sonnet...");
	const startTime = Date.now();

	// Ensure mimeType is one of the supported types
	const supportedMimeTypes = [
		"image/jpeg",
		"image/png",
		"image/webp",
		"image/gif",
	] as const;
	const validMimeType =
		supportedMimeTypes.find((type) => type === mimeType) ?? "image/jpeg";

	const promise = anthropic.messages
		.create({
			model: "claude-3-5-sonnet-20241022",
			max_tokens: 100,
			temperature: 0.1,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "image",
							source: {
								type: "base64",
								media_type: validMimeType,
								data: base64Data,
							},
						},
					],
				},
			],
		})
		.then((msg) => {
			const textContent = msg.content.find((block) => block.type === "text");
			console.log("Claude Sonnet response:", {
				content: textContent?.text,
				usage: msg.usage,
				raw: msg,
			});
			if (!textContent || textContent.type !== "text") {
				throw new Error("Unexpected response format from Claude");
			}
			const total = textContent.text.trim();
			const timeTaken = Date.now() - startTime;

			// Calculate cost based on input and output tokens
			const inputCost = (msg.usage.input_tokens / 1_000_000) * 3; // $3/MTok input
			const outputCost = (msg.usage.output_tokens / 1_000_000) * 15; // $15/MTok output
			const totalCost = inputCost + outputCost;

			return {
				total,
				timeTaken,
				cost: totalCost,
				tokenInfo: {
					inputTokens: msg.usage.input_tokens,
					outputTokens: msg.usage.output_tokens,
				},
			};
		});

	requestCache.set(cacheKey, promise);
	return promise;
}
*/

async function analyzeWithGPT4(
	base64Data: string,
	mimeType: string,
): Promise<ModelResult> {
	const cacheKey = `gpt4-${base64Data.slice(0, 100)}`;
	const cached = requestCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	console.log("Sending to GPT-4o-mini...");
	const startTime = Date.now();

	const promise = openai.chat.completions
		.create({
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
								url: `data:${mimeType};base64,${base64Data}`,
							},
						},
					],
				},
			],
			max_tokens: 100,
			temperature: 0.1,
		})
		.then((response) => {
			console.log("GPT-4o-mini response:", {
				content: response.choices[0].message.content,
				usage: response.usage,
				raw: response,
			});
			const total = response.choices[0].message.content?.trim() || "";
			const timeTaken = Date.now() - startTime;

			return {
				total,
				timeTaken,
				cost: 0.004, // Fixed cost per image
				tokenInfo: {
					inputTokens: response.usage?.prompt_tokens || 0,
					outputTokens: response.usage?.completion_tokens || 0,
				},
			};
		});

	requestCache.set(cacheKey, promise);
	return promise;
}

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("receipt") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// Log file details
		console.log(`Processing file: ${file.name}`);
		console.log(`File type: ${file.type}`);
		console.log(`File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File size must be less than 20MB" },
				{ status: 400 },
			);
		}

		// Get file data
		const bytes = await file.arrayBuffer();
		let buffer = Buffer.from(bytes);
		let mimeType = file.type;

		// Convert HEIC/HEIF to JPEG if needed
		if (CONVERTIBLE_TYPES.includes(file.type)) {
			console.log("Converting HEIC/HEIF to JPEG...");
			const converted = await convertHeicToJpeg(buffer);
			buffer = converted.data;
			mimeType = converted.mimeType;
			console.log(
				`Converted file size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
			);
		} else if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
			return NextResponse.json(
				{
					error: `Unsupported file type. Supported types are: ${[...SUPPORTED_MIME_TYPES, ...CONVERTIBLE_TYPES].join(", ")}`,
				},
				{ status: 400 },
			);
		}

		// Convert to base64
		const base64Data = buffer.toString("base64");
		console.log(
			`Base64 data size: ${(base64Data.length / 1024 / 1024).toFixed(2)}MB`,
		);

		// Create a TransformStream for streaming the results
		const stream = new TransformStream();
		const writer = stream.writable.getWriter();
		const encoder = new TextEncoder();

		// Start processing with all models
		const processModels = async () => {
			const amountRegex = /^£\d+\.\d{2}$/;
			const models = [
				{ name: "gemini", fn: () => analyzeWithGemini(base64Data, mimeType) },
				{ name: "qwen72b", fn: () => analyzeWithQwen72B(base64Data) },
				{ name: "qwen7b", fn: () => analyzeWithQwen7B(base64Data) },
				{
					name: "claude-haiku",
					fn: () => analyzeWithClaude(base64Data, mimeType),
				},
				// {
				// 	name: "claude-sonnet",
				// 	fn: () => analyzeWithClaudeSonnet(base64Data, mimeType),
				// },
				{ name: "gpt4", fn: () => analyzeWithGPT4(base64Data, mimeType) },
			];

			// Process each model and stream results as they complete
			for (const { name, fn } of models) {
				fn()
					.then((result) => {
						const modelResult =
							"error" in result
								? result
								: amountRegex.test(result.total)
									? result
									: {
											error: `Invalid response format: "${result.total}"`,
										};

						const data = `${JSON.stringify({
							model: name,
							result: modelResult,
						})}\n`;

						writer.write(encoder.encode(data));
					})
					.catch((error) => {
						const data = `${JSON.stringify({
							model: name,
							result: { error: error.message || "Analysis failed" },
						})}\n`;

						writer.write(encoder.encode(data));
					});
			}

			// Wait for all models to complete
			await Promise.all(models.map(({ fn }) => fn().catch(() => {})));
			await writer.close();
		};

		// Start processing in the background
		processModels();

		// Return the stream
		return new Response(stream.readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing receipt:", error);
		return NextResponse.json(
			{
				error:
					"Failed to process receipt. Please ensure the image is clear and contains a visible total amount.",
			},
			{ status: 500 },
		);
	}
}
