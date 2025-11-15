import { expect, test } from "bun:test";
import { ViewEngine } from "@core/View/ViewEngine";
import { view } from "@core/View/view";

test("view engine renders templates with variables", async () => {
	const engine = new ViewEngine();
	const html = await engine.render("welcome", {
		title: "Hello",
		heading: "Greetings",
		message: "Welcome home",
	});

	expect(html).toContain("Hello");
	expect(html).toContain("Greetings");
	expect(html).toContain("Welcome home");
});

test("view helper returns a Response", async () => {
	const response = await view("welcome", {
		title: "Hi",
		heading: "Headline",
		message: "Testing",
	});

	expect(response.headers.get("Content-Type")).toContain("text/html");
	const body = await response.text();
	expect(body).toContain("Headline");
});
