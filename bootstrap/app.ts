import { Application } from "@core/Foundation/Application";
import type { Exceptions } from "@core/Foundation/Http/Exceptions";
import type { MiddleWare } from "@core/Foundation/Http/Middleware";

// This bootstraps the application with routing, middleware, and exception handling
// Reference namespace Illuminate\Foundation\Configuration
export const app = new Application(
	import.meta.env.APP_BASE_PATH || process.cwd(),
)
	.withRouting({
		web: `${process.cwd()}/routes/web.ts`, // array|string|null
		api: `${process.cwd()}/routes/api.ts`, // array|string|null
		commands: `${process.cwd()}/routes/console.ts`, // ?string
		health: "/up", // ?string
	})
	// Reference namespace Illuminate\Foundation\Configuration\Middleware
	.withMiddleware((middleWare: MiddleWare): void => {
		middleWare.encryptCookies({
			except: ["appearance", "sidebar_state"],
		});

		middleWare.web({
			append: [],
			prepend: [],
			remove: [],
			replace: [],
		});
	})
	// Reference Laravel Illuminate\Foundation\Configuration\Exceptions
	.withExceptions((exceptions: Exceptions): void => {
		exceptions.report((error) => {
			console.error("[Lantern] Unhandled exception", error);
		});
	})
	// .booted()
	// .booting()
	// .registered()
	// .withBindings()
	// .withBroadcasting()
	// .withEvents()
	// .withCommands()
	// .withKernels()
	// .withProviders()
	// .withSchedule()
	// .withScopedSingletons()
	// .withSingletons()
	.create();
