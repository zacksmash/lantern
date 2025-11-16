// Model exactly after the Laravel database migration system
// @ts-nocheck
// biome-ignore-all lint: This is a migration file
import { Migration } from "@core/Database/Migrations/Migration";
import type { Blueprint } from "@core/Database/Schema/Blueprint";
import { Schema } from "@core/Support/Facades/Schema";

export default class extends Migration {
	public async up(): Promise<void> {
		Schema.create("users", (table: Blueprint) => {
			table.id();
			table.string("name");
			table.string("email").unique();
			table.string("password");
			table.rememberToken();
			table.timestamps();
		});
	}

	public async down(): Promise<void> {
		Schema.dropIfExists("users");
	}
}
