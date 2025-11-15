import { Config } from "@core/Config";
import { Env } from "@core/Env";
import { inertia } from "@core/Inertia/Inertia";
import { auth } from "@core/Support/Facades/Auth";
import { cache } from "@core/Support/Facades/Cache";
import { db } from "@core/Support/Facades/DB";
import { mason } from "@core/Support/Facades/Mason";
import { session } from "@core/Support/Facades/Session";
import { route } from "@core/Support/Facades/URL";
import { view } from "@core/View/view";

const env = new Env();
globalThis.env = env.get.bind(env);

const config = new Config();
config.load();
globalThis.config = config.get.bind(config);

globalThis.route = route;
globalThis.inertia = inertia;
globalThis.view = view;
globalThis.auth = auth;
globalThis.cache = cache;
globalThis.session = session;
globalThis.db = db;
globalThis.mason = mason;
