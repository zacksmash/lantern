import { expect, test } from "bun:test";
import { DatabaseManager } from "@core/Database/DatabaseManager";

const config = {
	default: "sqlite",
	connections: {
		sqlite: {
			driver: "sqlite" as const,
			options: {
				adapter: "sqlite",
				filename: ":memory:",
			},
		},
	},
};

test("database manager returns sqlite connection", async () => {
	const manager = new DatabaseManager(config);
	const connection = manager.connection();

	await connection`CREATE TABLE IF NOT EXISTS tests (id INTEGER PRIMARY KEY, name TEXT)`;
	await connection`INSERT INTO tests (name) VALUES (${"Codex"})`;

	const rows = await connection<{ name: string }[]>`SELECT name FROM tests`;
	expect(rows[0]?.name).toBe("Codex");
});
