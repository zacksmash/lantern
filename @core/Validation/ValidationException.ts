export class ValidationException extends Error {
	constructor(
		message: string,
		public readonly errors: Record<string, string[]>,
	) {
		super(message);
		this.name = "ValidationException";
	}
}
