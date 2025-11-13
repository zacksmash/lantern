import { Application } from '@core/Application';
import { Container } from '@core/Container';

export type ProviderConstructor = new (app: Application) => ServiceProvider;

export abstract class ServiceProvider {
  protected container: Container;

  constructor(protected app: Application) {
    this.container = app.getContainer();
  }

  register(): void {}
  boot(): void {}
}
