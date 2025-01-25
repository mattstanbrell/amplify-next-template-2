import { getCurrentUser, type AuthUser } from "aws-amplify/auth";
import { NextResponse } from "next/server";

interface AuthError extends Error {
	message: string;
}

function isAuthError(error: unknown): error is AuthError {
	return error instanceof Error && "message" in error;
}

export async function GET() {
	try {
		const user = await getCurrentUser();
		const userInfo = {
			username: user.username,
			signInDetails: user.signInDetails,
			userId: user.userId,
		};

		console.log("Debug Auth Info:", JSON.stringify(userInfo, null, 2));

		return NextResponse.json(userInfo);
	} catch (error: unknown) {
		console.error("Auth Debug Error:", error);
		const errorMessage = isAuthError(error) ? error.message : "Unknown error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
