# Routes

Routes are registered through the `Route` facade (resolved from the IoC container). The API is intentionally Laravel-like:

- Use verb helpers (`Route.get`, `.post`, `.match`, `.any`, `.resource`) with `{param}` placeholders and `{param?}` for optional segments.
- Chain `middleware`, `prefix`, `name`, `controller`, and `where` just like Laravel: `Route.middleware("auth").prefix("admin").name("admin.").group(() => { ... })`.
- Route handlers receive the framework `HttpRequest` wrapper. Call `await request.validate({...})` for Laravel-style validation before touching controller logic, and return responses using helpers such as `inertia("Users/Index", props)` or `view("welcome", data)`.
