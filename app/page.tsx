// app/page.tsx
"use client";

import "aws-amplify/auth/enable-oauth-listener";
import { signInWithRedirect } from "aws-amplify/auth";
import { useEffect } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();

	useEffect(() => {
		Hub.listen("auth", ({ payload }) => {
			if (payload.event === "signInWithRedirect") {
				router.push("/todo");
			}
		});

		// Check if already authenticated
		getCurrentUser()
			.then(() => router.push("/todo"))
			.catch(() => {
				/* Not signed in */
			});
	}, [router]);

	return (
		<main className="govuk-main-wrapper">
			<div className="govuk-width-container">
				<div className="govuk-grid-row">
					<div className="govuk-grid-column-two-thirds">
						<h1 className="govuk-heading-xl">
							Welcome to Hounslow Critical Service
						</h1>
						<p className="govuk-body">Please sign in to access the service.</p>
						<button
							onClick={() =>
								signInWithRedirect({
									provider: { custom: "MicrosoftEntraID" },
								})
							}
							className="govuk-button"
							data-module="govuk-button"
							type="button"
						>
							Sign in with Microsoft
						</button>
					</div>
				</div>
			</div>
		</main>
	);
}
