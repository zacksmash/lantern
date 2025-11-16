//@ts-nocheck
// biome-ignore-all lint: This is a bootstrap file
import { Application } from "@core/Foundation/Application";

// This bootstraps the application with routing, middleware, and exception handling
// Reference namespace Illuminate\Foundation\Configuration
const app = new Application(import.meta.env.APP_BASE_PATH || process.cwd())
  .withRouting({
    web: process.cwd() + "/routes/web.ts", // array|string|null
    api: process.cwd() + "/routes/api.ts", // array|string|null
    commands: process.cwd() + "/routes/console.ts", // ?string
    health: '/up', // ?string
    // channels: ?string
    // pages: ?string
    // apiPrefix = 'api' string
    // then: // ?callable
  })
  // Reference namespace Illuminate\Foundation\Configuration\Middleware
  .withMiddleware((middleWare: MiddleWare): void => {
    middleWare.encryptCookies({
      except: ['appearance', 'sidebar_state'],
    });

    middlewareManager.web({
      append: [
        // Register custom middleware here
        HandleAppearance,
        HandleInertiaRequests,
      ],
      prepend: // Register custom middleware here
      remove: // Remove middleware from the stack
      replace: // Replace middleware in the stack
    })
  })
  // Reference Laravel Illuminate\Foundation\Configuration\Exceptions
  .withExceptions((exceptions: Exceptions): void => {
    // Register custom exception handlers here
  }).create()
