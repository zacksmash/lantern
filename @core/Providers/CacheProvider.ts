import { Cache } from '@core/Cache';
import type { Container } from '@core/Container';

export class CacheProvider {
	register(container: Container) {
		container.singleton('cache', () => new Cache());
	}
}
