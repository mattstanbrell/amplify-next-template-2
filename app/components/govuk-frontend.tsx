"use client";

import { useEffect } from "react";

export function GovUKFrontend() {
	useEffect(() => {
		// Add js-enabled and govuk-frontend-supported classes
		document.body.className += ` js-enabled${"noModule" in HTMLScriptElement.prototype ? " govuk-frontend-supported" : ""}`;

		// Initialize GOV.UK Frontend
		// Could be beneficial to only import the parts we need
		(async () => {
			const { initAll } = await import("govuk-frontend");
			initAll();
		})();
	}, []);

	return null;
}
