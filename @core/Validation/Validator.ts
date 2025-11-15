import { ValidationException } from "@core/Validation/ValidationException";

export type RuleResult = {
	valid: boolean;
	value?: any;
	message?: string;
	stop?: boolean;
};
export type RuleFunction = (
	value: any,
	field: string,
	data: Record<string, any>,
) => RuleResult | boolean | string | undefined;
export type ValidationRule = string | RuleFunction;
export type ValidationRules = Record<string, ValidationRule | ValidationRule[]>;

type NormalizedRule =
	| { type: "builtin"; name: string; params: string[] }
	| { type: "callback"; fn: RuleFunction };

type RuleHandler = (
	value: any,
	field: string,
	data: Record<string, any>,
	params: string[],
) => RuleResult;

const defaultMessages: Record<
	string,
	(field: string, params: string[]) => string
> = {
	required: (field) => `${field} is required.`,
	string: (field) => `${field} must be a string.`,
	number: (field) => `${field} must be a numeric value.`,
	integer: (field) => `${field} must be an integer.`,
	boolean: (field) => `${field} must be true or false.`,
	array: (field) => `${field} must be an array.`,
	email: (field) => `${field} must be a valid email address.`,
	min: (field, params) => `${field} must be at least ${params[0]}.`,
	max: (field, params) => `${field} must not be greater than ${params[0]}.`,
	in: (field) => `${field} must be one of the allowed values.`,
	regex: (field) => `${field} format is invalid.`,
};

const isEmpty = (value: any) =>
	value === undefined ||
	value === null ||
	(typeof value === "string" && value.trim() === "") ||
	(Array.isArray(value) && value.length === 0);

const requiredRule: RuleHandler = (value) => ({ valid: !isEmpty(value) });

const nullableRule: RuleHandler = (value) => {
	if (isEmpty(value)) {
		return { valid: true, value: null, stop: true };
	}

	return { valid: true };
};

const stringRule: RuleHandler = (value) => ({
	valid: typeof value === "string",
});

const numberRule: RuleHandler = (value) => {
	if (typeof value === "number") {
		return { valid: !Number.isNaN(value) };
	}

	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return { valid: !Number.isNaN(parsed), value: parsed };
	}

	return { valid: false };
};

const integerRule: RuleHandler = (value, field, data, params) => {
	const result = numberRule(value, field, data, params);
	if (!result.valid) return result;
	const converted =
		typeof result.value === "number" ? result.value : Number(value);
	return {
		valid: Number.isInteger(converted),
		value: converted,
	};
};

const booleanRule: RuleHandler = (value) => {
	if (typeof value === "boolean") {
		return { valid: true };
	}

	if (typeof value === "string") {
		const lowered = value.toLowerCase();
		if (["true", "1"].includes(lowered)) return { valid: true, value: true };
		if (["false", "0"].includes(lowered)) return { valid: true, value: false };
	}

	if (typeof value === "number") {
		if (value === 1) return { valid: true, value: true };
		if (value === 0) return { valid: true, value: false };
	}

	return { valid: false };
};

const arrayRule: RuleHandler = (value) => ({ valid: Array.isArray(value) });

const emailRule: RuleHandler = (value) => {
	if (typeof value !== "string") return { valid: false };
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return { valid: regex.test(value) };
};

const minRule: RuleHandler = (value, _field, _data, params) => {
	const limit = Number(params[0]);
	if (Number.isNaN(limit)) return { valid: true };

	if (typeof value === "number") {
		return { valid: value >= limit };
	}

	if (typeof value === "string" || Array.isArray(value)) {
		return { valid: value.length >= limit };
	}

	return { valid: false };
};

const maxRule: RuleHandler = (value, _field, _data, params) => {
	const limit = Number(params[0]);
	if (Number.isNaN(limit)) return { valid: true };

	if (typeof value === "number") {
		return { valid: value <= limit };
	}

	if (typeof value === "string" || Array.isArray(value)) {
		return { valid: value.length <= limit };
	}

	return { valid: false };
};

const inRule: RuleHandler = (value, _field, _data, params) => ({
	valid: params.map((option) => option.trim()).includes(String(value)),
});

const regexRule: RuleHandler = (value, _field, _data, params) => {
	if (typeof value !== "string") return { valid: false };
	const rawPattern = params[0];
	if (!rawPattern) return { valid: true };
	const pattern = rawPattern;

	const match = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
	if (match) {
		const [, body = "", flags = ""] = match;
		const regex = new RegExp(body, flags);
		return { valid: regex.test(value) };
	}

	return { valid: new RegExp(pattern).test(value) };
};

const builtinRules: Record<string, RuleHandler> = {
	required: requiredRule,
	nullable: nullableRule,
	string: stringRule,
	number: numberRule,
	integer: integerRule,
	boolean: booleanRule,
	array: arrayRule,
	email: emailRule,
	min: minRule,
	max: maxRule,
	in: inRule,
	regex: regexRule,
};

export class Validator {
	static validate(data: Record<string, any>, rules: ValidationRules) {
		const errors: Record<string, string[]> = {};
		const validated: Record<string, any> = {};

		for (const [field, fieldRules] of Object.entries(rules)) {
			const normalized = Validator.normalizeRules(fieldRules);
			const requiresField = normalized.some(
				(rule) => rule.type === "builtin" && rule.name === "required",
			);
			let value = Validator.getValue(data, field);

			if (typeof value === "undefined" && !requiresField) {
				continue;
			}

			let fieldHasError = false;

			for (const rule of normalized) {
				if (rule.type === "builtin") {
					const handler = builtinRules[rule.name];

					if (!handler) {
						throw new Error(`Unknown validation rule "${rule.name}".`);
					}

					const result = handler(value, field, data, rule.params);
					if (!result.valid) {
						errors[field] = errors[field] ?? [];
						errors[field].push(
							result.message ??
								defaultMessages[rule.name]?.(field, rule.params) ??
								`${field} validation for ${rule.name} failed.`,
						);
						fieldHasError = true;
						break;
					}

					if (typeof result.value !== "undefined") {
						value = result.value;
					}

					if (result.stop) {
						break;
					}
				} else {
					const outcome = rule.fn(value, field, data);

					if (outcome === undefined || outcome === true) {
						continue;
					}

					if (outcome === false) {
						errors[field] = errors[field] ?? [];
						errors[field].push(`${field} validation failed.`);
						fieldHasError = true;
						break;
					}

					if (typeof outcome === "string") {
						errors[field] = errors[field] ?? [];
						errors[field].push(outcome);
						fieldHasError = true;
						break;
					}

					if (typeof outcome === "object") {
						if (outcome.valid === false) {
							errors[field] = errors[field] ?? [];
							errors[field].push(
								outcome.message ?? `${field} validation failed.`,
							);
							fieldHasError = true;
							break;
						}

						if (typeof outcome.value !== "undefined") {
							value = outcome.value;
						}

						if (outcome.stop) {
							break;
						}
					}
				}
			}

			if (!fieldHasError && typeof value !== "undefined") {
				Validator.setValue(validated, field, value);
			}
		}

		if (Object.keys(errors).length > 0) {
			throw new ValidationException(errors);
		}

		return validated;
	}

	private static normalizeRules(
		rules: ValidationRule | ValidationRule[],
	): NormalizedRule[] {
		const raw = Array.isArray(rules) ? rules : [rules];
		const normalized: NormalizedRule[] = [];

		for (const rule of raw) {
			if (typeof rule === "string") {
				const segments = rule
					.split("|")
					.map((segment) => segment.trim())
					.filter(Boolean);

				for (const segment of segments) {
					normalized.push(Validator.parseRule(segment));
				}
			} else if (typeof rule === "function") {
				normalized.push({ type: "callback", fn: rule });
			}
		}

		return normalized;
	}

	private static parseRule(rule: string): NormalizedRule {
		const colonIndex = rule.indexOf(":");
		const name = (colonIndex === -1 ? rule : rule.slice(0, colonIndex)).trim();
		const paramString = colonIndex === -1 ? "" : rule.slice(colonIndex + 1);

		const params =
			name === "regex"
				? [paramString]
				: paramString
						.split(",")
						.map((param) => param.trim())
						.filter(Boolean);

		return {
			type: "builtin",
			name,
			params,
		};
	}

	private static getValue(data: Record<string, any>, key: string) {
		if (!key) return data;
		const segments = key.split(".");
		let current: any = data;

		for (const segment of segments) {
			if (!segment) return undefined;
			if (current == null) return undefined;
			current = current[segment];
		}

		return current;
	}

	private static setValue(
		target: Record<string, any>,
		key: string,
		value: any,
	) {
		if (!key) return;
		const segments = key.split(".");
		let current: Record<string, any> = target;

		for (let i = 0; i < segments.length - 1; i++) {
			const segment = segments[i];
			if (!segment) return;
			if (typeof current[segment] !== "object" || current[segment] === null) {
				current[segment] = {};
			}
			current = current[segment];
		}

		const lastSegment = segments[segments.length - 1];
		if (!lastSegment) return;
		current[lastSegment] = value;
	}
}
