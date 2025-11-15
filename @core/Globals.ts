import { Config } from "@core/Config";
import { Env } from "@core/Env";
import { inertia } from "@core/Inertia/Inertia";
import { route as routeHelper } from "@core/Routing/Facades/URL";
import { view } from "@core/View/view";

const env = new Env();
globalThis.env = env.get.bind(env);

const config = new Config();
config.load();
globalThis.config = config.get.bind(config);

globalThis.route = routeHelper;
globalThis.inertia = inertia;
globalThis.view = view;
