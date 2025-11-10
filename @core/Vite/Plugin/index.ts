import fs from 'node:fs';
import path from 'node:path';

interface LanternConfig {
	input: string;
	output: string;
}

export default function lantern(lantern?: LanternConfig) {
	return {
		name: 'lantern-vite-config',

		config() {
			return {
				build: {
					manifest: true,
					outDir: lantern?.output || 'public/build',
					emptyOutDir: true,
					rollupOptions: {
						input: path.resolve(
							process.cwd(),
							lantern?.input || 'assets/js/app.ts',
						),
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
