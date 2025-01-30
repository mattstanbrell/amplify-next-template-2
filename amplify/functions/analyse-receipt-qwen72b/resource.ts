import { defineFunction, secret } from "@aws-amplify/backend";

export const analyseReceiptQwen72b = defineFunction({
	name: "analyse-receipt-qwen72b",
	environment: {
		HYPERBOLIC_API_KEY: secret("HYPERBOLIC_API_KEY"),
	},
});
