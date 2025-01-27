const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
	sassOptions: {
		includePaths: [path.join(__dirname, "app")],
	},
};

module.exports = nextConfig;
