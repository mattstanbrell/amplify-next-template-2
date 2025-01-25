const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
	sassOptions: {
		includePaths: [path.join(__dirname, "styles")],
	},
	webpack: (config) => {
		config.module.rules.push({
			test: /\.(woff2|webmanifest)$/i,
			type: "asset/resource",
		});
		return config;
	},
};

module.exports = nextConfig;
