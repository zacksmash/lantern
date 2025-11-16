import { Application } from "@core/Application/Application";
import { registerGlobalMiddleware } from "@core/Http/Middleware/Manifest";
import { HandleInertiaRequests } from "@root/app/middleware/HandleInertiaRequests";

registerGlobalMiddleware(HandleInertiaRequests);

const application = new Application();
await application.configure(process.cwd());
application.create();

registerGlobalMiddleware(HandleInertiaRequests);

export const app = application;
