export type AnalysisResult = {
	total: string;
	timeTaken: number;
	cost: number;
	tokenInfo?: {
		inputTokens: number;
		outputTokens: number;
	};
};

export type AnalysisError = {
	error: string;
};

export type ModelResult = AnalysisResult | AnalysisError;

export const SYSTEM_PROMPT =
	"Analyse this receipt image. Find and return ONLY the total amount paid, formatted as £XX.XX (for example £82.56). Return ONLY the amount, no other text or explanation.";

// Supported MIME types
export const SUPPORTED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const CONVERTIBLE_TYPES = ["image/heic", "image/heif"];

// Maximum file size (20MB)
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
