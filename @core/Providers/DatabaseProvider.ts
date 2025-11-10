import type { Container } from '@core/Container';
import { Database } from '@core/Database';

export class DatabaseProvider {
	register(container: Container) {
		container.singleton('db', () => new Database());
	}
}
