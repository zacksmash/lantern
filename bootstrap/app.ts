import { Application } from '@core/Application';

export const app = new Application()
	.configure(import.meta.dir)
	.withRouting(/* TODO */)
	.withMiddleware(/* TODO */)
	.withExceptions(/* TODO */)
	.create(/* TODO */);
