# HTTP Request & Response

Lantern’s HTTP layer mirrors Laravel’s developer ergonomics: a rich `HttpRequest` object for controller/middleware code and a lightweight response factory for crafting responses.

## HttpRequest

```ts
import { HttpRequest } from "@core/Http/Request";

export class UserController {
  async store(request: HttpRequest) {
    const data = await request.validate({
      name: "required|string|min:3",
      email: "required|email",
    });

    return HttpResponse.json({ created: true, data }, { status: 201 });
  }
}
```

### Key APIs

- `request.all()` – merges query string + body payloads into a single object.
- `request.input(key, default?)` / `request.only([...])` / `request.except([...])`
- `request.query(key?, default?)` – read query params.
- `request.route(key?)` – access route parameters (populated by the router).
- `request.header(name)` / `request.headers()` / `request.bearerToken()`.
- `request.merge(data)` – merge values into the parsed body.
- `request.validate(rules)` – minimal rule set (`required`, `string`, `numeric`, `email`, `min`, `max`) that throws a `ValidationException` on failure. Successful validation is cached and can be retrieved via `request.validated()`.
- `request.wantsJson()` – inspects the `Accept` header.

Internally, the request parses JSON, URL-encoded, and multipart form-data payloads (other content types default to `{}`) and caches the result to keep method calls synchronous from the caller’s perspective.

## Responses

`@core/Http/Response` provides two complementary APIs:

```ts
import { HttpResponse, response } from "@core/Http/Response";

// Static helpers
return HttpResponse.json({ ok: true }, { status: 201 });
return HttpResponse.redirect("/dashboard");
return HttpResponse.noContent();

// Fluent builder
return response()
  .status(202)
  .header("x-powered-by", "lantern")
  .json({ accepted: true })
  .toResponse();
```

Use the builder when you want chainable header/status mutations before sending. Otherwise, the static helpers wrap common cases (JSON responses, redirects, `204` bodies, etc.) while still returning native `Response` instances compatible with Bun’s fetch runtime.

### Plain-Value Response Prep

The framework ships with a `ResponseFactory` that converts common return values into HTTP responses (mirroring Laravel’s “return strings/arrays” ergonomics). This is particularly handy inside controllers:

```ts
import { ResponseFactory } from "@core/Http/ResponseFactory";

// Later, the router/kernel can call:
return ResponseFactory.prepare("Plain string");          // text/html
return ResponseFactory.prepare("<p>Fragment</p>");       // text/html
return ResponseFactory.prepare({ page: "home" });        // JSON
return ResponseFactory.prepare(new Date());              // ISO JSON string
return ResponseFactory.prepare(null);                    // 204
```

We’ll wire this factory into the router/kernel as routing comes online so controller methods can simply `return 'Hello'` or `return { ok: true }` without manually instantiating responses.
