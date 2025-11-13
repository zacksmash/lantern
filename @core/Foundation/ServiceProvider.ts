import { Application } from '@core/Application';
import { Container } from '@core/Container';

export type ProviderConstructor = new (app: Application) => ServiceProvider;

export abstract class ServiceProvider {
  protected app: Application;
  protected container: Container;

  constructor(app: Application) {
    this.app = app;
    this.container = app.container;
  }

  register(container: Container): void {}
  boot(container: Container): void {}
}
