import { envNumber } from "@core/Support/env";
import { app } from "./bootstrap/app";

const port = envNumber("PORT", 3000);

export const server = Bun.serve({
  port,
  development: app.isDebug(),
  async fetch(request: Request) {
    const httpRequest = app.captureRequest(request);
    const response = await app.dispatch(httpRequest);
    await app.terminate(httpRequest, response);

    return response;
  },
  error(error: unknown) {
    return app.handleError(error);
  },
});

console.log(`Lantern server ready at http://localhost:${server.port} (${app.getEnvironment()})`);
