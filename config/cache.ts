export default {
	default: "memory",
	prefix: env("CACHE_PREFIX", "lantern_cache"),
	stores: {
		memory: {
			driver: "memory",
		},
		redis: {
			driver: "redis",
			prefix: env("REDIS_CACHE_PREFIX", env("CACHE_PREFIX", "lantern_cache")),
			options: {
				url: env("REDIS_URL", "") || undefined,
				host: env("REDIS_HOST", "127.0.0.1"),
				port: Number(env("REDIS_PORT", "6379")),
				username: env("REDIS_USERNAME", "") || undefined,
				password: env("REDIS_PASSWORD", "") || undefined,
				database: Number(env("REDIS_DB", "0")),
				tls: env("REDIS_TLS", "false") === "true",
			},
		},
		sqlite: {
			driver: "sqlite",
			connection: {
				adapter: "sqlite",
				filename: env(
					"CACHE_SQLITE_PATH",
					`${process.cwd()}/storage/cache.sqlite`,
				),
			},
		},
		mysql: {
			driver: "mysql",
			connection: {
				adapter: "mysql",
				hostname: env("CACHE_MYSQL_HOST", "127.0.0.1"),
				port: Number(env("CACHE_MYSQL_PORT", "3306")),
				username: env("CACHE_MYSQL_USERNAME", "root"),
				password: env("CACHE_MYSQL_PASSWORD", ""),
				database: env("CACHE_MYSQL_DATABASE", "lantern"),
			},
		},
		pgsql: {
			driver: "pgsql",
			connection: {
				adapter: "postgres",
				hostname: env("CACHE_PGSQL_HOST", "127.0.0.1"),
				port: Number(env("CACHE_PGSQL_PORT", "5432")),
				username: env("CACHE_PGSQL_USERNAME", "postgres"),
				password: env("CACHE_PGSQL_PASSWORD", ""),
				database: env("CACHE_PGSQL_DATABASE", "lantern"),
			},
		},
	},
};
