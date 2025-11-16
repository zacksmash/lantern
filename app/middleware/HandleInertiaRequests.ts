import type { Middleware } from "@core/Http/Middleware/Contracts";
import type { HttpRequest } from "@core/Http/Request";
import { always } from "@core/Inertia/Inertia";
import type { InertiaProps } from "@core/Inertia/InertiaTypes";
import {
	getSharedData,
	INERTIA_SHARED_PROPS_ATTRIBUTE,
	type SharedDataPayload,
} from "@core/Inertia/SharedData";

export class HandleInertiaRequests implements Middleware {
	async handle(request: HttpRequest, next: () => Promise<Response>) {
		const shared = await this.collectSharedProps(request);

		const existing = request.getAttribute<SharedDataPayload>(
			INERTIA_SHARED_PROPS_ATTRIBUTE,
		) ?? { values: {}, providers: [] };

		request.setAttribute(INERTIA_SHARED_PROPS_ATTRIBUTE, {
			values: { ...existing.values, ...shared.values },
			providers: [...existing.providers, ...shared.providers],
		});

		return next();
	}

	protected share(request: HttpRequest): InertiaProps | Promise<InertiaProps> {
		return {
			appName: globalThis.config?.("app.name") ?? "Lantern",
			"auth.user": always(() => request.user()),
		};
	}

	private async collectSharedProps(
		request: HttpRequest,
	): Promise<SharedDataPayload> {
		const globalShares = getSharedData();
		const localShares = await Promise.resolve(this.share(request));

		return {
			values: { ...globalShares.values, ...localShares },
			providers: [...globalShares.providers],
		};
	}
}
