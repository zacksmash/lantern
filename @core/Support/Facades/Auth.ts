import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { AuthManager } from "@core/Auth/AuthManager";
import { app } from "@root/bootstrap/app";

export const auth = (): AuthManager => {
	return app.resolve(ContainerTokens.AuthManager);
};

export const Auth = auth;
