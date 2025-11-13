import { RoutingServiceProvider } from '@core/Routing/RoutingServiceProvider';
import AppServiceProviders from '@root/bootstrap/providers';

export const Providers = [
  RoutingServiceProvider,
  ...AppServiceProviders
];
