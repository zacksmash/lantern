import type { HttpRequest } from "@core/Http/Request";

export interface Authenticatable {
	getAuthIdentifier(): string | number;
}

export interface Guard {
	user(request: HttpRequest): Promise<Authenticatable | null>;
	login(user: Authenticatable, request: HttpRequest): Promise<void>;
	logout(request: HttpRequest): Promise<void>;
}
