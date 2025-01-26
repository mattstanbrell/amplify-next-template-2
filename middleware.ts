// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { runWithAmplifyServerContext } from "@/utils/amplify-utils";
import { fetchAuthSession } from "aws-amplify/auth/server";

/**
 * Helper function to check if the user has a valid access token
 * Uses AWS Amplify's auth session to verify authentication status
 */
async function getAccessToken(request: NextRequest): Promise<boolean> {
	try {
		const session = await runWithAmplifyServerContext({
			nextServerContext: {
				request,
				response: NextResponse.next(),
			},
			operation: async (contextSpec) => {
				const session = await fetchAuthSession(contextSpec);
				return session.tokens?.accessToken !== undefined;
			},
		});
		return session;
	} catch {
		return false;
	}
}

/**
 * Next.js Middleware for protecting routes
 * - Allows public access to the home page
 * - Requires authentication for all other routes
 * - Redirects to home page if authentication fails
 */
export async function middleware(request: NextRequest) {
	// Allow public access to home page
	if (request.nextUrl.pathname === "/") {
		return NextResponse.next();
	}

	try {
		// Check if user has a valid access token
		const hasAccessToken = await getAccessToken(request);

		// Allow access if user is authenticated
		if (hasAccessToken) {
			return NextResponse.next();
		}

		// Redirect to home page if not authenticated
		return NextResponse.redirect(new URL("/", request.url));
	} catch (error) {
		// Handle any authentication errors by redirecting to home page
		return NextResponse.redirect(new URL("/", request.url));
	}
}

/**
 * Configure which routes should be processed by this middleware
 * Excludes static files, API routes, and other Next.js system files
 */
export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
