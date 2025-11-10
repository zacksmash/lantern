import { SQL } from 'bun';

export class Database {
	private async connection() {
		return new SQL({
			adapter: 'mysql',
			hostname: 'localhost',
			port: 3306,
			database: 'db_budget',
			username: 'root',
		});
	}

	async query(queryString: string, params: any[] = []) {
		const db = await this.connection();

		return await db`${queryString}, ${params}`;
	}
}
