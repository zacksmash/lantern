import { envNumber } from "@core/Support/env";
import { app } from "./bootstrap/app";

const port = envNumber("PORT", 3000);

export const server = Bun.serve({
  port,
  development: app.isDebug(),
  async fetch(request: Request) {
    return app.handleRequest(request);
  },
  error(error: unknown) {
    return app.handleError(error);
  },
});

console.log(`Lantern server ready at http://localhost:${server.port} (${app.getEnvironment()})`);
