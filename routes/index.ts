import { AboutController } from "@app/controllers/AboutController";
import { IndexController } from "@app/controllers/IndexController";
import { Route } from "@core/Routing/Facades/Route";

Route.get("/", IndexController).name("index");
Route.get("/about", AboutController).name("about");
