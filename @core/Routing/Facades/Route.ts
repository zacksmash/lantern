import { ContainerTokens } from "@core/Application/ContainerTokens";
import { app } from "@root/bootstrap/app";

export const Route = app.resolve(ContainerTokens.Router);
