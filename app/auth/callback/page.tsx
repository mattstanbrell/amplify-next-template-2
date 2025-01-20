"use client";

import "aws-amplify/auth/enable-oauth-listener";
import { Hub } from "aws-amplify/utils";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function RedirectPage() {
	const { user } = useAuthenticator();

	// Listen for the signInWithRedirect event on redirect
	Hub.listen("auth", ({ payload }) => {
		switch (payload.event) {
			case "signInWithRedirect":
				console.log("Redirect sign-in successful. Current user:", user);
				break;
			case "signInWithRedirect_failure":
				console.error("Redirect sign-in FAILED", payload.data);
				break;
		}
	});

	// Show a loading state if user is not yet fully signed in
	if (!user) return <p>Finishing sign-in. Loading…</p>;

	return <p>You are signed in as {user.signInDetails?.loginId}</p>;
}
