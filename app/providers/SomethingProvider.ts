import { ServiceProvider } from '@core/Foundation/ServiceProvider';

export class SomethingProvider extends ServiceProvider {
  override register(): void {
    // Register something in the container
    this.app.bind('something', () => {
      return { message: 'This is something from SomethingProssssvider' };
    });
  }

  override boot(): void {
    const something = this.app.resolve('something');
    console.log('SomethingProvider booted:', something.message);
  }
}
