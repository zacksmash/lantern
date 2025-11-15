# Views

Lantern includes a lightweight Blade-inspired view engine for rendering HTML emails, marketing pages, or fallback responses alongside Inertia.

## Directory Layout

- Templates live inside `resources/views`.
- Call `view("welcome")` to render `resources/views/welcome.html`.
- Nested paths work with dot or slash notation (`view("auth/login")` → `resources/views/auth/login.html`).

```html
<!-- resources/views/welcome.html -->
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>{{ title }}</title>
		@vite
	</head>
	<body>
		<h1>Hello, {{ name }}!</h1>
	</body>
</html>
```

## Rendering Responses

```ts
return view("welcome", { title: "Lantern", name: "Ada" }, { status: 201 });
```

- The helper renders HTML and returns a `Response` with `Content-Type: text/html; charset=utf-8`.
- Pass a third argument to override status/headers.
- Variables rendered via `{{ variable }}` are HTML-escaped (`&`, `<`, `>`, quotes, apostrophes). Render unescaped HTML manually if needed.

## Vite Integration

`ViewEngine` replaces `@vite` tokens with the tags produced by `ViteAssetTagGenerator`, so your templates automatically load either the dev server or hashed production files—just like Laravel’s `@vite` directive.

## Custom Engines

Instantiate `ViewEngine` yourself to change the base path or inject a custom `TemplateLoader`/`ViteAssetTagGenerator`:

```ts
const engine = new ViewEngine("/app/mail/views");
const html = await engine.render("emails/reset-password", { url: resetUrl });
```

## App Shell Renderer

Inertia responses rely on `AppShellRenderer`, which loads `assets/index.html`, swaps `@vite`, and injects `@inertia` with the serialized page data. Keep those tokens intact if you customize the SPA shell.

Lantern’s view system is intentionally minimal yet familiar, giving you Laravel-style helpers without pulling in Blade.***
