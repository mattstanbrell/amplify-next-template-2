import { type NextRequest, NextResponse } from "next/server";
import { convertHeicToJpeg } from "../../../utils/image-utils";
import {
	SUPPORTED_MIME_TYPES,
	CONVERTIBLE_TYPES,
	MAX_FILE_SIZE,
} from "../../../amplify/functions/shared/types";
import { handler as geminiHandler } from "../../../amplify/functions/analyse-receipt-gemini/handler";
import { handler as qwen72bHandler } from "../../../amplify/functions/analyse-receipt-qwen72b/handler";
import { handler as qwen7bHandler } from "../../../amplify/functions/analyse-receipt-qwen7b/handler";
import { handler as claudeHandler } from "../../../amplify/functions/analyse-receipt-claude/handler";
import { handler as gpt4Handler } from "../../../amplify/functions/analyse-receipt-gpt4/handler";

function formatBytes(bytes: number): string {
	const sizes = ["Bytes", "KB", "MB", "GB"];
	if (bytes === 0) return "0 Byte";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${Math.round(bytes / 1024 ** i)} ${sizes[i]}`;
}

function logSize(message: string, size: number) {
	const formattedSize = formatBytes(size);
	const logMessage = `[RECEIPT ANALYSIS] ${message}: ${formattedSize}`;
	console.log(logMessage);
	// Also log to browser console via response headers
	return logMessage;
}

export async function POST(request: NextRequest) {
	const logs: string[] = [];
	try {
		// Log the raw request details
		console.log(
			"[RECEIPT ANALYSIS] Request headers:",
			Object.fromEntries(request.headers.entries()),
		);

		const formData = await request.formData();
		console.log(
			"[RECEIPT ANALYSIS] FormData keys:",
			Array.from(formData.keys()),
		);

		const file = formData.get("receipt") as File;
		console.log("[RECEIPT ANALYSIS] File object:", {
			name: file?.name,
			type: file?.type,
			size: file?.size,
		});

		if (!file) {
			throw new Error("No file provided");
		}

		// Log file details before processing
		logs.push(logSize("Original file size", file.size));

		// Process file
		const bytes = await file.arrayBuffer();
		let currentBuffer = Buffer.from(bytes);
		logs.push(
			logSize("Buffer size after initial conversion", currentBuffer.length),
		);

		let mimeType = file.type;

		// Convert HEIC/HEIF if needed
		if (CONVERTIBLE_TYPES.includes(file.type)) {
			const converted = await convertHeicToJpeg(currentBuffer);
			currentBuffer = converted.data;
			mimeType = converted.mimeType;
			logs.push(logSize("Size after HEIC conversion", currentBuffer.length));
		} else if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
			throw new Error(`Unsupported file type: ${file.type}`);
		}

		const base64Data = currentBuffer.toString("base64");
		logs.push(logSize("Base64 string size", base64Data.length));

		// Validate file size
		if (base64Data.length > MAX_FILE_SIZE) {
			throw new Error(
				`File size (${formatBytes(base64Data.length)}) exceeds limit of ${formatBytes(MAX_FILE_SIZE)}`,
			);
		}

		// Create stream
		const stream = new TransformStream();
		const writer = stream.writable.getWriter();

		// Define model endpoints and their corresponding handlers
		const modelEndpoints = [
			{
				name: "gemini",
				handler: geminiHandler,
			},
			{
				name: "qwen72b",
				handler: qwen72bHandler,
			},
			{
				name: "qwen7b",
				handler: qwen7bHandler,
			},
			{
				name: "claude-haiku",
				handler: claudeHandler,
			},
			{
				name: "gpt4",
				handler: gpt4Handler,
			},
		];

		// Process each model in parallel
		const modelPromises = modelEndpoints.map(async ({ name, handler }) => {
			try {
				console.log(`[RECEIPT ANALYSIS] Sending to ${name}...`);
				const response = (await handler({
					body: base64Data,
					headers: {
						"content-type": mimeType,
					},
				})) as { statusCode: number; body: string };

				const result = JSON.parse(response.body);
				console.log(`[RECEIPT ANALYSIS] ${name} response:`, result);

				const eventText = `event: ${name}\ndata: ${JSON.stringify(result)}\n\n`;
				const encoder = new TextEncoder();
				const eventBytes = encoder.encode(eventText);
				await writer.write(eventBytes);
			} catch (error: unknown) {
				console.log(`[RECEIPT ANALYSIS] ${name} error:`, error);
				const errorText = `event: ${name}\ndata: ${JSON.stringify({
					error:
						error instanceof Error ? error.message : "Unknown error occurred",
				})}\n\n`;
				const encoder = new TextEncoder();
				const errorBytes = encoder.encode(errorText);
				await writer.write(errorBytes);
			}
		});

		// Close the stream after all models have completed
		Promise.all(modelPromises).then(() => writer.close());

		// Return the stream with logs in headers
		return new Response(stream.readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"X-Size-Logs": logs.join(" | "),
				"X-Debug-Info": "Stream created successfully",
			},
		});
	} catch (error) {
		console.error("[RECEIPT ANALYSIS] Error:", error);
		return NextResponse.json(
			{
				error: "Failed to process receipt",
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				logs: logs,
			},
			{
				status: 500,
				headers: {
					"X-Size-Logs": logs.join(" | "),
					"X-Error-Details":
						error instanceof Error ? error.message : String(error),
				},
			},
		);
	}
}
