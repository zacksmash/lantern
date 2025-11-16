import { AboutController } from "@app/controllers/AboutController";
import { IndexController } from "@app/controllers/IndexController";
import { RedirectController } from "@app/controllers/RedirectController";
import { Route } from "@core/Support/Facades/Route";

Route.get("/", IndexController).name("index");
Route.post("/", [IndexController, "store"]).name("index.post");
Route.get("/about", AboutController).name("about");
Route.get("/redirect", RedirectController).name("redirect");
