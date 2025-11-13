import { Application } from '@core/Application';

export const app = new Application()
  .configure(process.cwd())
  .create();
