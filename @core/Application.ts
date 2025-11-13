import { Container } from '@core/Container';
import { type ProviderConstructor } from './Foundation/ServiceProvider';
import { Providers } from '@core/Foundation/Providers';

export class Application {
  container: Container;
  private basePath: string = '';
  private providersBooted = false;
  private loadedProviders: ProviderConstructor[] = Providers;
  private serviceProviders: InstanceType<ProviderConstructor>[] = [];

  constructor() {
    this.container = new Container();

    this.serviceProviders = this.loadedProviders.map(
      ProviderClass => new ProviderClass(this)
    );

    this.registerProviders();
  }

  public configure(basePath: string): this {
    this.basePath = basePath;

    this.bootProviders();

    return this;
  }

  public create(): Application {
    return this;
  }

  private registerProviders() {
    for (const provider of this.serviceProviders) {
      provider.register(this.container);
    }
  }

  private bootProviders() {
    if (this.providersBooted) return;

    for (const provider of this.serviceProviders) {
      provider.boot(this.container);
    }

    this.providersBooted = true;
  }

  public singleton(key: string, resolver: any) {
    this.container.singleton(key, resolver);
  }

  public bind(key: string, resolver: any) {
    this.container.bind(key, resolver);
  }

  public instance(key: string, value: any) {
    this.container.instance(key, value);
  }

  resolve<T = any>(key: string): T {
    return this.container.resolve(key);
  }

  async handleRequest(request: Request): Promise<Response> {
    const router = this.resolve('router');

    return router.dispatch(request);
  }
}
