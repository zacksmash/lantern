import { IndexController } from "@app/Controllers/IndexController";
import { Route } from "@core/Support/Facades/Route";

Route.get("/", IndexController);
