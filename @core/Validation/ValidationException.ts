export class ValidationException extends Error {
	status = 422;
	errors: Record<string, string[]>;

	constructor(errors: Record<string, string[]>) {
		super("The given data was invalid.");
		this.name = "ValidationException";
		this.errors = errors;
	}

	toJSON() {
		return {
			message: this.message,
			errors: this.errors,
		};
	}
}
