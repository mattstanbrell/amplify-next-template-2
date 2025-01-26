// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/utils/amplify-utils";

export async function middleware(request: NextRequest) {
	console.log("Middleware called for path:", request.nextUrl.pathname);
	const response = NextResponse.next();

	// Don't protect the home page or OAuth callback
	if (request.nextUrl.pathname === "/") {
		console.log("Home page accessed - allowing access");
		return response;
	}

	console.log("Checking authentication...");
	const authenticated = await runWithAmplifyServerContext({
		nextServerContext: { request, response },
		operation: async (contextSpec) => {
			try {
				console.log("Fetching auth session...");
				const session = await fetchAuthSession(contextSpec);
				const hasAccessToken = session.tokens?.accessToken !== undefined;
				console.log("Auth check result:", hasAccessToken);
				return hasAccessToken;
			} catch (error) {
				console.error("Auth check failed:", error);
				return false;
			}
		},
	});

	if (authenticated) {
		console.log("User is authenticated - allowing access");
		return response;
	}

	console.log("User is not authenticated - redirecting to home page");
	return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
