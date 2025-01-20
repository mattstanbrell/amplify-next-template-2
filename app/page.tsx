"use client";

import { useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import { signInWithRedirect } from "aws-amplify/auth";
import outputs from "@/amplify_outputs.json";
import { useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "./../app/app.css";

Amplify.configure(outputs);

export default function App() {
	const { user, signOut } = useAuthenticator();

	function signInMicrosoft() {
		return signInWithRedirect({
			provider: {
				// Must match the "name" in the resource.ts OIDC array
				custom: "MicrosoftEntraID",
			},
		});
	}

	if (!user) {
		return (
			<main>
				<h1>Welcome</h1>
				<button onClick={signInMicrosoft}>Sign In with Microsoft</button>
			</main>
		);
	}

	// User is signed in
	return (
		<main>
			<h1>{user.signInDetails?.loginId} is signed in</h1>
			<button onClick={signOut}>Sign out</button>
		</main>
	);
}
