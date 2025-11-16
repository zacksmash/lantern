// Create Laravel-like factory
// @ts-nocheck
// biome-ignore-all lint: This is a factory file
import { User } from "@app/Models/User";
import { Factory } from "@core/Database/Mason/Factories/Factory";
import { Hash } from "@core/Support/Facades/Hash";

export class UserFactory extends Factory {
	protected model = User;

	public async definition(): Promise<Partial<User>> {
		return {
			// fake() helper method
			name: fake().name(),
			email: fake().email(),
			password: "password", // model should auto hash this from a casts array/property
		};
	}
}
