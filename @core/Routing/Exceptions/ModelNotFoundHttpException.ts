export class ModelNotFoundHttpException extends Error {
	public readonly status = 404;

	constructor(
		public readonly parameter: string,
		public readonly value: string,
		public readonly previous?: unknown,
	) {
		super(`Route binding for "${parameter}" could not be resolved.`);
		this.name = "ModelNotFoundHttpException";
	}
}
