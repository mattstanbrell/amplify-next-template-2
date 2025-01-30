import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { analyseReceiptGemini } from "./functions/analyse-receipt-gemini/resource";
import { analyseReceiptQwen72b } from "./functions/analyse-receipt-qwen72b/resource";
import { analyseReceiptQwen7b } from "./functions/analyse-receipt-qwen7b/resource";
import { analyseReceiptClaude } from "./functions/analyse-receipt-claude/resource";
import { analyseReceiptGpt4 } from "./functions/analyse-receipt-gpt4/resource";

export const backend = defineBackend({
	auth,
	analyseReceiptGemini,
	analyseReceiptQwen72b,
	analyseReceiptQwen7b,
	analyseReceiptClaude,
	analyseReceiptGpt4,
});
