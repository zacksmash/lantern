import type { Authenticatable } from "@core/Auth/Contracts";
import type {
	AuthCredentials,
	UserProvider,
} from "@core/Auth/UserProviders/UserProvider";
import { Hash } from "@core/Support/Hash";

export type ArrayUserRecord = Authenticatable & {
	password: string;
	[key: string]: unknown;
};

export interface ArrayUserProviderConfig {
	identifier?: string;
	users: ArrayUserRecord[];
}

export class ArrayUserProvider implements UserProvider {
	private identifier: string;

	constructor(private config: ArrayUserProviderConfig) {
		this.identifier = config.identifier ?? "email";
	}

	async retrieveById(id: string | number): Promise<Authenticatable | null> {
		const record = this.config.users.find((user) => user.id === id);
		return record ? this.cleanup(record) : null;
	}

	async retrieveByCredentials(
		credentials: AuthCredentials,
	): Promise<Authenticatable | null> {
		const identifier = credentials[this.identifier];
		if (typeof identifier !== "string" && typeof identifier !== "number") {
			return null;
		}

		const record = this.config.users.find(
			(user) =>
				String(user[this.identifier]).toLowerCase() ===
				String(identifier).toLowerCase(),
		);

		return record ? this.cleanup(record) : null;
	}

	async validateCredentials(
		user: Authenticatable,
		credentials: AuthCredentials,
	): Promise<boolean> {
		const password = credentials.password;
		if (typeof password !== "string") {
			return false;
		}

		const record = this.config.users.find((item) => item.id === user.id);
		if (!record) {
			return false;
		}

		return await Hash.verify(password, record.password);
	}

	private cleanup(record: ArrayUserRecord): Authenticatable {
		const { password: _password, ...rest } = record;
		return { ...rest };
	}
}
