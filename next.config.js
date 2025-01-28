const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
	sassOptions: {
		includePaths: [path.join(__dirname, "app")],
	},
	async rewrites() {
		return [
			{
				source: "/govuk-assets/:path*",
				destination: "/node_modules/govuk-frontend/dist/govuk/assets/:path*",
			},
		];
	},
};

module.exports = nextConfig;
