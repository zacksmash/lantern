export interface Middleware {
	handle(request: Request, next: () => Promise<Response>): Promise<Response>;
}
