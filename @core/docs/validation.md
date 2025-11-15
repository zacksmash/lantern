# Validation

Lantern ships a server-side validator that mirrors Laravel's API for common rules. Use it from controllers, services, or middleware via `await request.validate(rules)`.

## Built-in rules
| Rule | Behavior |
| ---- | -------- |
| `required` | Ensures the value exists and is not empty. |
| `nullable` | Allows missing/empty values and casts them to `null`, then stops further rules. |
| `string` | Requires a string. |
| `number` | Accepts numeric strings/numbers and casts to `number`. |
| `integer` | Casts to number and ensures it is an integer. |
| `boolean` | Accepts booleans, `"true"/"false"`, `"1"/"0"`, or `1/0`, casting to a boolean. |
| `array` | Requires an array. |
| `email` | Validates against a simple email regex. |
| `min:value` | Checks numeric value or string/array length. |
| `max:value` | Checks numeric value or string/array length. |
| `in:foo,bar` | Restricts values to the provided list (whitespace trimmed). |
| `regex:/pattern/flags` | Applies the provided regex (with or without slashes).

## Using the validator
```ts
const data = await request.validate({
  name: "required|string|max:255",
  age: ["required", "integer", "min:18"],
  email: "nullable|email",
  role: (value) => value === "admin" || "Role must be admin.",
});
```
- Rules can be strings (`"required|string"`) or arrays. Arrays may mix strings and callbacks.
- Callback rules receive `(value, field, data)` and can return:
  - `true`/`undefined` to pass,
  - `false` or a string message to fail,
  - `{ valid, value?, message?, stop? }` for advanced control.
- Validated values (including casts from number/boolean/integer rules) are returned in a nested object that matches your field keys (dot notation supported).

```ts
const payload = await request.validate({
	"name.first": "required|string",
	"name.last": "required|string",
	"profile.bio": "nullable|string|max:200",
	tags: "array",
	"tags.*": (value) =>
		value.length <= 20 || "Each tag must be 20 characters or fewer.",
});
```

## Error handling
- Failures throw `ValidationException` (`@core/Validation/ValidationException.ts`). `HandleError` in production converts this into `422` JSON: `{ message, errors }`.
- During development, Lantern still throws the exception so Bun prints stack traces.

## Tips
- Combine `nullable` with other rules to allow optional fields.
- Use custom callbacks to integrate async validation (lookups, API checks). Return a promise from your resolver and `await request.validate` will handle it.
- Structure nested payloads with dot notation (`"address.street"`) so the validator can build nested objects automatically.

```ts
import { Validator } from "@core/Validation/Validator";

export const validateInvitation = async (data: Record<string, any>) => {
	return Validator.validate(data, {
		email: "required|email",
		token: async (value) => {
			const exists = await Invitation.findByToken(value);
			return exists || "Invitation token is invalid.";
		},
	});
};
```
