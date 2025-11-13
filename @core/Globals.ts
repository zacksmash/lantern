import { Env } from "@core/Env";

const env = new Env();
globalThis.env = env.get.bind(env);
