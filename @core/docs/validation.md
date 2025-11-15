# Validation

Lantern’s validator mirrors Laravel’s rule syntax and error handling. Use it via `await request.validate(rules)` or by importing `Validator.validate(data, rules)`.

## Available Rules

| Rule | Description |
| --- | --- |
| `required` | Value must be present and not empty. |
| `nullable` | Allows empty values, casts them to `null`, and stops further rules. |
| `string` | Requires a string. |
| `number` | Accepts numeric strings/numbers and casts to a number. |
| `integer` | Ensures the numeric value is an integer. |
| `boolean` | Accepts booleans, `"true"/"false"`, `"1"/"0"`, `1/0`. |
| `array` | Requires an array. |
| `email` | Validates basic email syntax. |
| `min:value` / `max:value` | For numbers or string/array length. |
| `in:foo,bar` | Restricts to the provided options. |
| `regex:/pattern/flags` | Applies a custom regular expression. |

Combine rules with pipes (`"required|string|max:255"`) or arrays (`["required", "integer"]`).

## Custom Rules

Rules can be functions receiving `(value, field, data)` and returning:

- `true`/`undefined` – validation passes.
- `false` – fails with a generic message.
- `string` – fails with the provided message.
- `{ valid, value?, message?, stop? }` – full control (convert values, stop further rules, etc.).

Async functions are supported, so you can hit databases or APIs during validation.

## Request Helper

```ts
const data = await request.validate({
	name: "required|string|max:255",
	email: "required|email",
	age: "nullable|integer|min:18",
});
```

The helper merges query + body data (`request.all()`), runs the validator, and returns the sanitized payload. Failures throw `ValidationException`, which `HandleError` converts into a `422` JSON response (`{ message, errors }`).

## Dot Notation & Wildcards

Use dot notation to validate nested objects, and `*` for wildcard indices:

```ts
const payload = await request.validate({
	"user.name": "required|string",
	"user.email": "required|email",
	"tags.*": "string|max:20",
});
```

The returned object mirrors your nested structure.

## Standalone Usage

```ts
import { Validator } from "@core/Validation/Validator";

export const validateInvitation = (data: Record<string, unknown>) => {
	return Validator.validate(data, {
		email: "required|email",
		token: async (value) => {
			const exists = await Invitation.findByToken(value);
			return exists || "Invalid invitation token.";
		},
	});
};
```

## Error Handling

- Validation failures throw `ValidationException`. Catch it manually if you need custom responses, or let `HandleError` respond with JSON.
- During development Lantern rethrows errors so you can inspect stack traces.

Lantern’s validation layer is intentionally Laravel-like, so migrating rules or reusing mental models is effortless.***
