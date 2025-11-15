import { ContainerTokens } from "@core/Application/ContainerTokens";
import type { SessionManager } from "@core/Session/SessionManager";
import { app } from "@root/bootstrap/app";

export const session = (): SessionManager => {
	return app.resolve(ContainerTokens.SessionManager);
};

export const Session = session;
