import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { Router } from "@core/Routing/Router";
import { app } from "@root/bootstrap/app";

export const Route: Router = app.resolve(ContainerTokens.Router);
