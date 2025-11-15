export default {
	default: env("DB_CONNECTION", "sqlite"),
	connections: {
		sqlite: {
			driver: "sqlite",
			options: {
				adapter: "sqlite",
				filename: env(
					"DB_DATABASE",
					`${process.cwd()}/storage/database.sqlite`,
				),
			},
		},
		mysql: {
			driver: "mysql",
			options: {
				adapter: "mysql",
				hostname: env("DB_HOST", "127.0.0.1"),
				port: Number(env("DB_PORT", "3306")),
				username: env("DB_USERNAME", "root"),
				password: env("DB_PASSWORD", ""),
				database: env("DB_DATABASE", "lantern"),
			},
		},
		pgsql: {
			driver: "pgsql",
			options: {
				adapter: "postgres",
				hostname: env("DB_HOST", "127.0.0.1"),
				port: Number(env("DB_PORT", "5432")),
				username: env("DB_USERNAME", "postgres"),
				password: env("DB_PASSWORD", ""),
				database: env("DB_DATABASE", "lantern"),
			},
		},
	},
};
