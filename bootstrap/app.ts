import { Application } from "@core/Application/Application";

const application = new Application();
await application.configure(process.cwd());
application.create();

export const app = application;
