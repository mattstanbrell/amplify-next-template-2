// utils/amplify-utils.ts
import { cookies } from "next/headers";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { getCurrentUser } from "aws-amplify/auth/server";
import outputs from "@/amplify_outputs.json";

export const { runWithAmplifyServerContext } = createServerRunner({
	config: outputs,
});

export async function AuthGetCurrentUserServer() {
	return await runWithAmplifyServerContext({
		nextServerContext: { cookies },
		operation: (contextSpec) => getCurrentUser(contextSpec),
	});
}
