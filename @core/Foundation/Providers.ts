import { RoutingServiceProvider } from '@core/Routing/RoutingServiceProvider';
import AppProviders from '@root/bootstrap/providers';

export const Providers = [
  RoutingServiceProvider,
  ...AppProviders
];
