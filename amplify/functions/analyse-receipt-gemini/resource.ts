import { defineFunction, secret } from "@aws-amplify/backend";

export const analyseReceiptGemini = defineFunction({
	name: "analyse-receipt-gemini",
	environment: {
		GEMINI_API_KEY: secret("GEMINI_API_KEY"),
	},
});
