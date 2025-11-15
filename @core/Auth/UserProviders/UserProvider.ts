import type { Authenticatable } from "@core/Auth/Contracts";

export type AuthCredentials = Record<
	string,
	string | number | boolean | undefined
>;

export interface UserProvider {
	retrieveById(id: string | number): Promise<Authenticatable | null>;
	retrieveByCredentials(
		credentials: AuthCredentials,
	): Promise<Authenticatable | null>;
	validateCredentials(
		user: Authenticatable,
		credentials: AuthCredentials,
	): Promise<boolean>;
}
