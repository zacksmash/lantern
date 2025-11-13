import { ServiceProvider } from '@core/Foundation/ServiceProvider';
import { Router } from "@core/Routing/Router";

export class RoutingServiceProvider extends ServiceProvider {
  override register(): void {
    this.app.singleton('router', () => {
      return new Router();
    });
  }

  override boot(): void {
    import('@root/routes');
  }
}
