"use client";

import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

// `ssr: true` is required for Next.js integration
// This ensures authentication tokens are stored in cookies (not local storage) for server access
// Cookies are sent to the server for each request
Amplify.configure(outputs, { ssr: true });

// Configures Amplify on the client side
// Should be imported and rendered in the root layout
export default function ConfigureAmplifyClientSide() {
	return null;
}
