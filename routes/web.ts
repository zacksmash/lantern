// @ts-nocheck
// biome-ignore-all lint: This is a routes file

import { AboutController } from "@app/Controllers/AboutController";
import { IndexController } from "@app/Controllers/IndexController";
import { Route } from "@core/Support/Facades/Route";

// Use a closure
Route.get("/about", () => view("about")).name("about");

// Use a controller that automatically calls an invoke()
Route.get("/", IndexController).name("index");

// Use a controller with a specific method
Route.post("/", [IndexController, "store"]).name("index.post");

// Use a route with a parameter that auto-resolves a model
Route.get("/user/{user}", [AboutController, "show"]).name("about");

// More Laravel-like routing methods should be added
