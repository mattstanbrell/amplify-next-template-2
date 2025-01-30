import { defineFunction, secret } from "@aws-amplify/backend";

export const analyseReceiptGpt4 = defineFunction({
	name: "analyse-receipt-gpt4",
	environment: {
		OPENAI_API_KEY: secret("OPENAI_API_KEY"),
	},
});
