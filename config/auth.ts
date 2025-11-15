export default {
	defaults: {
		guard: "web",
	},
	guards: {
		web: {
			driver: "session",
			provider: "users",
		},
	},
	providers: {
		users: {
			driver: "array",
			identifier: "email",
			users: [],
		},
	},
	redirects: {
		authenticated: "/",
	},
	basic: {
		username: env("AUTH_BASIC_USERNAME", ""),
		password: env("AUTH_BASIC_PASSWORD", ""),
		realm: env("AUTH_BASIC_REALM", "Restricted Area"),
	},
	password_timeout: Number(env("AUTH_PASSWORD_TIMEOUT", "10800")),
};
