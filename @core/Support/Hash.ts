export class Hash {
	static async make(
		value: string,
		options: { algorithm?: "bcrypt"; cost?: number } = {},
	): Promise<string> {
		const algorithm = options.algorithm ?? "bcrypt";
		const cost = options.cost ?? 10;
		return await Bun.password.hash(value, { algorithm, cost });
	}

	static async verify(value: string, hashed: string): Promise<boolean> {
		return Bun.password.verify(value, hashed);
	}
}
