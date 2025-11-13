import { IndexController } from "@app/controllers/IndexController";
import { Route } from "@core/Routing/Facades/Route";

Route.get("/", IndexController).name("index");
