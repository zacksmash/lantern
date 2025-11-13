import fs from 'node:fs';
import path from 'node:path';

export default function lantern() {
	return {
		name: 'lantern-plugin-vite',

		config() {
			return {
				build: {
					manifest: true,
					outDir: 'public/build',
					emptyOutDir: true,
					rollupOptions: {
						input: path.resolve(process.cwd(), 'assets/js/app.ts'),
					},
				},

				server: {
					hmr: true,
				},

				resolve: {
					alias: {
						'@': path.resolve(process.cwd(), 'assets/js'),
					},
				},
			};
		},

		configureServer(server: any) {
			const hotFile = path.resolve('public/hot');
			const url = `http://[::1]:${server.config.server.port}`;

			const writeHot = () => {
				fs.mkdirSync('public', { recursive: true });
				fs.writeFileSync(hotFile, url);
			};

			const clean = () => {
				if (fs.existsSync(hotFile)) fs.rmSync(hotFile);
			};

			server.httpServer.once('listening', writeHot);

			process.on('exit', clean);
			process.on('SIGINT', () => process.exit());
			process.on('SIGTERM', () => process.exit());
			process.on('SIGHUP', () => process.exit());
		},
	};
}
