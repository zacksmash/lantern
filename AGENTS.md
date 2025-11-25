# Project details

Lantern is a Laravel-inspired web framework, built with Bun (https://bun.com). Using Lantern should feel exactly like using Laravel, with Laravel inspired API's to interact with core classes and utilities. It should use the latest practices when designing features, using Typescript for full typesafety and IDE autocomplete which should feel magical and intuitive.

## Adding features

- Always write tests for framework features in @core/Testing
- Always check every file for typescript errors
- Awalys run bun run lint_check to find linting errors and fix them

## Bun Wrapper

First steps are to create Laravel-style wrappers around main Bun features

- Error Handling
- Request
- Response
- Cookies
- Env
- Fetch (Http)
- SQLite
- MySQL
- Postgres
- Redis
- Hashing
- File io/S3
- Websockets
- Routing
