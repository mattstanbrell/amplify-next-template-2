"use client";

import { useEffect } from "react";

export function GovUKFrontend() {
	useEffect(() => {
		// Add js-enabled class as soon as the component mounts (JavaScript is available)
		document.body.className = `${document.body.className} js-enabled`;

		// Initialize GOV.UK Frontend
		(async () => {
			const { initAll } = await import("govuk-frontend");
			initAll();
		})();
	}, []);

	return null;
}
