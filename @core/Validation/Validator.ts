import type { ValidationRules } from "@core/Http/Request";

type PlainObject = Record<string, unknown>;

interface ValidationResult {
	valid: boolean;
	errors: Record<string, string[]>;
	data: PlainObject;
}

type RuleHandler = (value: unknown, arg?: string) => boolean | Promise<boolean>;

const RULES: Record<string, RuleHandler> = {
	required(value) {
		return !(value === undefined || value === null || value === "");
	},
	string(value) {
		return typeof value === "string";
	},
	numeric(value) {
		return (
			value !== undefined && value !== null && !Number.isNaN(Number(value))
		);
	},
	email(value) {
		if (typeof value !== "string") {
			return false;
		}

		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
	},
	min(value, arg) {
		if (!arg) {
			return true;
		}

		const length =
			typeof value === "number" ? value : String(value ?? "").length;
		return length >= Number(arg);
	},
	max(value, arg) {
		if (!arg) {
			return true;
		}

		const length =
			typeof value === "number" ? value : String(value ?? "").length;
		return length <= Number(arg);
	},
};

export class Validator {
	constructor(
		private readonly data: PlainObject,
		private readonly rules: ValidationRules,
	) {}

	validate(): ValidationResult {
		const errors: Record<string, string[]> = {};
		const output: PlainObject = {};

		for (const fieldKey of Object.keys(this.rules)) {
			const field = fieldKey as string;
			const ruleSet = this.rules[field]!;
			const value = this.data[field];
			const rulesArray = Array.isArray(ruleSet) ? ruleSet : ruleSet.split("|");

			for (const rule of rulesArray) {
				const [rawName, rawArg] = rule.split(":");
				const name = rawName ?? "";
				const arg = rawArg ?? undefined;
				const handler = RULES[name as keyof typeof RULES];
				if (!handler) {
					continue;
				}

				const passes = handler(value, arg);
				if (!passes) {
					const bag = errors[field] ?? [];
					if (!errors[field]) {
						errors[field] = bag;
					}
					bag.push(this.formatMessage(name, field, arg));
					break;
				}
			}

			if (!errors[field] && value !== undefined) {
				output[field] = value;
			}
		}

		return {
			valid: Object.keys(errors).length === 0,
			errors,
			data: output,
		};
	}

	private formatMessage(rule: string, field: string, arg?: string): string {
		switch (rule) {
			case "required":
				return `${field} is required.`;
			case "string":
				return `${field} must be a string.`;
			case "numeric":
				return `${field} must be numeric.`;
			case "email":
				return `${field} must be a valid email address.`;
			case "min":
				return `${field} must be at least ${arg}.`;
			case "max":
				return `${field} may not be greater than ${arg}.`;
			default:
				return `${field} is invalid.`;
		}
	}
}
