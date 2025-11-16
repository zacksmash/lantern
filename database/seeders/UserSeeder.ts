// Create a laravel-like seeder for users table
// @ts-nocheck
// biome-ignore-all lint: This is a seeder file
import { User } from "@app/Models/User";
import { Seeder } from "@core/Database/Seeder";

export default class UserSeeder extends Seeder {
	public async run(): Promise<void> {
		const users = [
			{
				name: "John Doe",
				email: "john@example.com",
				password: "password123",
			},
			{
				name: "Jane Smith",
				email: "jane@example.com",
				password: "password123",
			},
		];

		for (const userData of users) {
			User.create(userData);
		}
	}
}
