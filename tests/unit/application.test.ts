import { expect, test } from "bun:test";
import { Application } from "@core/Application/Application";
import { ContainerTokens } from "@core/Application/ContainerTokens";

test("application binds itself inside the container", async () => {
	const app = await new Application().configure(process.cwd());
	const container = app.getContainer();

	expect(container.resolve(ContainerTokens.App)).toBe(app);
	expect(container.resolve(Application)).toBe(app);
});
