import { defineAuth, secret } from "@aws-amplify/backend";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
	loginWith: {
		email: true,
		externalProviders: {
			oidc: [
				{
					name: "MicrosoftEntraID",
					clientId: secret("MICROSOFT_CLIENT_ID"),
					clientSecret: secret("MICROSOFT_CLIENT_SECRET"),
					issuerUrl:
						"https://login.microsoftonline.com/4c70b964-f256-4054-ace6-6375714daa99",
					scopes: ["openid", "profile", "email"],
				},
			],
			logoutUrls: [
				"http://localhost:3000/",
				"https://main.d2k6jx4fqnxjbh.amplifyapp.com",
			],
			callbackUrls: [
				"http://localhost:3000/profile",
				"https://mywebsite.com/profile",
			],
		},
	},
});
