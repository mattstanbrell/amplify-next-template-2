import { defineFunction, secret } from "@aws-amplify/backend";

export const analyseReceiptClaude = defineFunction({
	name: "analyse-receipt-claude",
	environment: {
		MY_ANTHROPIC_API_KEY: secret("ANTHROPIC_API_KEY"),
	},
});
