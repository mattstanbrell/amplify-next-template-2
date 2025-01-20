"use client";

import "aws-amplify/auth/enable-oauth-listener";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Hub } from "aws-amplify/utils";

export default function RedirectPage() {
	const { user } = useAuthenticator();

	Hub.listen("auth", ({ payload }) => {
		if (payload.event === "signInWithRedirect") {
			// The user should now be signed in.
			// You can fetch user info here if needed.
		}
	});

	if (!user) return <p>Loading…</p>;

	return <p>You are signed in as {user.signInDetails?.loginId}</p>;
}
