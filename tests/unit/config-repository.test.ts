import { ConfigRepository } from "@core/Config/Repository";

test("loads config files dynamically from the config directory", () => {
	const repo = new ConfigRepository(process.cwd());

	expect(repo.get<string>("app.name")).toBe("Lantern");
	expect(
		repo.get<string>("database.connections.sqlite.driver"),
	).toBe("sqlite");
});
