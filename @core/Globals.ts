import { Config } from "@core/Config";
import { Env } from "@core/Env";

const env = new Env();
globalThis.env = env.get.bind(env);

const config = new Config();
config.load();
globalThis.config = config.get.bind(config);
