import { HttpRequest, type ValidationRules } from "./Request";

/**
 * Laravel-style FormRequest that encapsulates authorization + validation.
 * Instantiate from an existing raw Request to preserve headers/body/query.
 */
export abstract class FormRequest extends HttpRequest {
	private resolved = false;

	constructor(raw: Request, routeParameters: Record<string, unknown> = {}) {
		super(raw, routeParameters);
	}

	static override capture(
		_raw: Request,
		_routeParameters: Record<string, unknown> = {},
	): FormRequest {
		throw new Error(
			"Use FormRequest.fromRequest to create form requests from the current HttpRequest.",
		);
	}

	static async fromRequest<T extends FormRequest>(
		request: HttpRequest,
		ctor: new (raw: Request, routeParameters?: Record<string, unknown>) => T,
	): Promise<T> {
		const instance = new ctor(request.raw, request.route());
		await instance.validateResolved();
		return instance;
	}

	protected async validateResolved(): Promise<void> {
		if (this.resolved) return;

		if (!(await this.authorize())) {
			throw new Error("This action is unauthorized.");
		}

		await this.validate(this.rules());
		this.resolved = true;
	}

	/**
	 * Override to add per-request authorization logic.
	 */
	// eslint-disable-next-line @typescript-eslint/require-await
	async authorize(): Promise<boolean> {
		return true;
	}

	/**
	 * Override to provide validation rules.
	 */
	abstract rules(): ValidationRules;
}
