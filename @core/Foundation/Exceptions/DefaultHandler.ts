import { ExceptionHandler } from "./Handler";

export class DefaultExceptionHandler extends ExceptionHandler {
	override async render(): Promise<Response | undefined> {
		return undefined;
	}
}
