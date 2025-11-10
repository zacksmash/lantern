import fs from 'node:fs';
import path, { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

function hotFilePlugin() {
	return {
		name: 'bun-hot-file',
		configureServer(server: any) {
			const hotFile = path.resolve('public/hot');
			const url = `http://[::1]:${server.config.server.port}`;

			// Write hot file on server start
			fs.writeFileSync(hotFile, url);

			// Remove on close
			const clean = () => {
				if (fs.existsSync(hotFile)) {
					fs.rmSync(hotFile);
				}
			};

			process.on('exit', clean);
			process.on('SIGINT', () => process.exit());
			process.on('SIGTERM', () => process.exit());
			process.on('SIGHUP', () => process.exit());
		},
	};
}

export default defineConfig({
	plugins: [
		hotFilePlugin(),
		tailwindcss(),
		vue({
			template: {
				transformAssetUrls: {
					base: null,
					includeAbsolute: false,
				},
			},
		}),
	],

	build: {
		manifest: true,
		outDir: 'public/build',
		emptyOutDir: true,
		copyPublicDir: false,

		rollupOptions: {
			input: resolve(__dirname, 'assets/js/app.ts'), // ENTRYPOINT 🚀
		},
	},

	server: {
		strictPort: true,
		port: 5173,
		hmr: true, // HMR ✅
	},
});
