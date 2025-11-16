# A new web framework based on Bunjs and Typescript - Heavily influenced by Laravel PHP Framework

# Bash Commands

- Please, always check code changes with typescript checker (bunx tsc),
- Run the code linter (bun run lint)
- tests should be added for each component and ran with (bun run test)
- All linting errors/warnings and typescript errors and warnings should be fixed before finishing a task

# Code Style

- This project is typescript, using the Class syntax.
- Everything should be fully type-safe, and autocomplete in IDE's should work like magic
- Use ES modules (import/export) syntax, not CommonJS (require)
- Destructure imports when possible (eg. import { foo } from 'bar')
- Follow the skeleton’s `tsconfig.json` for compatibility:

# Workflow

- Be sure to typecheck when you’re done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance
- Create a `docs` directory inside @core and document any features added. Documentation should be written like the Laravel documentation, as if a user of the framework were learning it. Use code examples and highlight common use cases.
- Use the `codex` directory to keep track of your understanding of the application, where we currently are and projected next steps as well as anyother documentation you will find necessary and useful for future tasks.
- Always reach out to external sources provided to help design features and implementations.

# Explore, plan, code, commit

- Refer to the Laravel API documentation here: https://api.laravel.com/docs/12.x/index.html, Remember @core is the same as Illuminate
- Read relevant files and directories to get a sense of where the project currently is
- Plan out the steps required to implement each feature, using Laravel as a base for all decisions
- Write the code, ensuring consistency and readablity are paramount
- Finish the task by documenting what was added, changed with code examples of how to use the feature

# Write tests, commit; code, iterate, commit

- Stick to test driven development, write tests based on expected input/output pairs
- run the tests and confirm they fail.
- commit the tests when you’re satisfied with them
- write code that passes the tests, do not modify the tests, keep going until all tests pass
- commit code

## Conventions

- Project structure mirrors root structure, minus @core
- Keep public APIs stable. If changes are necessary, update docs + tests first.
- Avoid adding new dependencies unless they’re essential.
- Don’t add license headers or sweeping formatters/config unless asked.
- Follow TypeScript best practices; use descriptive names; avoid one‑letter variables.
- Keep code comments brief and purposeful.

## Proposing Changes

0. For non‑trivial design or any public API change, create an RFC (`docs/rfcs/README.md`) and follow the template.
1. Update acceptance criteria in `docs/SKELETON_APP.md` and/or `docs/TEST_PLAN.md`
2. Add/adjust tests in `skeleton/tests/*`
3. Update `packages/core/index.d.ts` if the public API changes
4. Implement the minimal feature in `packages/*`
5. Ensure docs remain accurate (including `AGENTS.md` per Docs Sync Requirement)

This project is a web framework that emulates Laravel, as close as possible, within the confines of Typescript and the Class syntax it provides. Anything that is available in a Laravel application should be available with a familiar and exact syntax from Laravel. Emphasis should be placed on making the Developer Experience feel extremly close to a Laravel PHP application.

We should leverage native Bun features as much as possible. Things like SQLite, MySQL, Postgres, Redis, File System, etc. These should all be wrapped around Buns implementation of these features.

The entry point of the application is server.ts, It should handle incoming requests and defer to an Http Kernel, as well as be used for Global Error Handling

The framework code should be written to @core (treat @core as the Illuminate namespace)
All classes should be imported from @core

Always emphasize security when making decisions about the application code, security should never be sacrificed.

An emphasis on creating a Facade like implementation across the framework, like this example:

```ts
import type { Router } from "@core/Routing/Router";

export const Route: Router = app.resolve({ router_container_token });

// usage

import { Route } from "@core/Support/Facades/Route";

Route.get("/dashboard", DashboardController);
```

As well as a helper methods implementation:

```ts
import type { CacheManager } from "@core/Cache/CacheManager";

// Helper
export const cache = (): CacheManager => {
  return app.resolve({ cache_container_token });
};

// Facade
export const Cache: CacheManager = cache;
```

Some of the application code has mocked out APIs and implementations that are exactly how I would like it to work, please do not modify these and only use them as a baseline for how you can make that API work, exactly as is.

# Core (@core) Framework Directories

Here are the main component directories we'd like to include in the application code that matches the Laravel core structure. Please create the classes to go in them, as it aligns with the Laravel API.

Auth: User authentication and authorization

- Access
- Console
- Events
- Listeners
- Middleware
- Notifications
- Passwords
  Broadcasting: Broadcasting Events, interacts with websockets
- Broadcasters
  Bus: Command bus
- Events
  Cache: Driver based caching system with multiple options
- Console
- Events
- RateLimiting
  Collections: Laravel style collection class that can be used on standard arrays or ORM Models
- Traits
  Conditionabe
- Traits
  Config: Application configuration `./config`
  Console: A console based cli to interact and create files, we'll come up with a name for this, like `artisan`
- Concerns
- Contracts
- Events
- resources
- Scheduling
- View
  Container: An application service container to bind services to as singletons, transients or scoped objects
- Attributes
  Contracts
- Auth
- Broadcasting
- Bus
- Cache
- COnfig
- Console
- Container
- Cookie
- Database
- Debug
- Encryption
- Events
- Filesystem
- Foundation
- Hashing
- Http
- Log
- Mail
- Notifications
- Pagination
- Pipeline
- Queue
- Redis
- Routing
- Session
- Support
- Translation
- Validation
- View
  Cookie: A Cookie system to manage cookies
- Middleware
  Database: A driver based database system with multiple options
- Capsule
- Concerns
- Connectors
- Console
- Eloquent (We'll use a different name for our ORM/Active Record, like `Eloquent`)
- Events
- Migrations
- Query
- Schema
  Encryption
  Events: A global events system
  Filesystem: A driver base filesystem with multiple options
  Foundation
- Auth
- Bootstrap
- Concerns
- Configuration
- Console
- Events
- Exceptions
- Http
- Providers
- Queue
- resources
- Routing
- stubs
- Support
- Testing
- Validation
  Hashing
  Http: An HTTP client
- Client
- Concerns
- Exceptions
- Middlware
- Resources
- Testing
  JsonSchema: JSON Schema Builder
- Types
  Log: Application logging with multiple levels
- Context
- Events
  Macroable: Allow common classes to have macros added to them to allow users to extend them
- Traits
  Mail: A driver based email system with multiple options
- Events
- Mailables
- resources
- Transport
  Notifications: User notification system with multiple options
- Channels
- Console
- Events
- Message
- resources
  Pagination
- resources
  Pipeline
  Queue: A queue worker system to allow developers to queue jobs in the background
- Attributes
- Capsule
- Connectors
- Console
- Events
- Failed
- Jobs
- Middleware
  Redis: A redis client for cache, session, etc.
- Connections
- Connectors
- Events
- Limiters
  Routing: A fully featured routing system, based on all of Laravels `Route::` facade methods
- Console
- Contracts
- Controllers
- Events
- Exceptions
- Matching
- Middleware
  Session: A session management system
- Console
- Middleware
  Support
- Exceptions
- Facades
- Testing
- Traits
  Testing: Testing framework and helpers
- Concerns
- Constraints
- Exceptions
- Fluent
  Validation: A validator class to be extended to the Request and Form Requests features
- Concerns
- Rules

# Views will be handled primarily as Inertia responses

## References:

- https://github.com/inertiajs/inertia-laravel
- https://github.com/inertiajs/inertiajs.com/tree/v2/resources/js/Pages
  View (primarily Inertia-based)
- Commands
- Middleware
- Ssr
- Support
- Testing
- Files:
  - AlwaysProp
  - ComponentNotFoundException
  - Controller
  - DeferProp
  - Directive
  - EncryptHistoryMiddleware
  - IgnoreFirstLoad
  - Inertia
  - LazyProp
  - Mergable
  - MergeProp
  - MergesProps
  - Middleware
  - OptionalProp
  - PropertyContext
  - ProvidesInertiaProperties
  - ProvidesInertiaProperty
  - ProvidesScrollMetadata
  - RenderContext
  - Response
  - ResponseFactory
  - ScrollMetadata
  - ScrollProp
  - ServiceProvider
