# App Middleware

Use the application middleware builder to register middleware without editing the core manifest manually.

```ts
// bootstrap/app.ts
const application = new Application().withMiddleware((middleware) => {
	middleware
		.global(HandleInertiaRequests)
		.web({ append: [HandleInertiaRequests] })
		.encryptCookies(["custom-cookie"]);
});
```

Lantern ships with `HandleInertiaRequests` (see `app/middleware/HandleInertiaRequests.ts`) so you can share global data with every Inertia response. Use the builder to add it to the global stack or to the `web` middleware group as needed. The builder also lets you register aliases and tweak middleware-specific options (like cookie encryption exceptions) in one place.
Use the exported helpers (`Inertia.share`, `Inertia.shareAlways`, or `always`) to mark props that should persist across partial visits (validation errors, auth state, etc.).
