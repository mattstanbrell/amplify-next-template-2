import { defineFunction, secret } from "@aws-amplify/backend";

export const analyseReceiptQwen7b = defineFunction({
	name: "analyse-receipt-qwen7b",
	environment: {
		HYPERBOLIC_API_KEY: secret("HYPERBOLIC_API_KEY"),
	},
});
