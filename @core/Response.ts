import crypto from 'node:crypto';
import { request } from '@core/RequestContext';

async function isViteRunning(): Promise<string | false> {
	try {
		const hotFile = await Bun.file('public/hot').text();
		return hotFile.trim();
	} catch {
		return false;
	}
}

const viteDev: string | false = await isViteRunning();

async function isInertiaRequest(): Promise<boolean> {
	const req = request();
	return req?.headers.get('X-Inertia') === 'true';
}

async function inertiaVersion(): Promise<string> {
	try {
		const manifest = await Bun.file('public/build/.vite/manifest.json').text();
		return crypto.createHash('md5').update(manifest).digest('hex');
	} catch {
		return `dev-${Date.now()}`;
	}
}

async function inertiaPayload(
	component: string,
	props: Record<string, any> = {},
): Promise<string> {
	const payload = {
		component,
		props,
		url: request()?.url,
		version: await inertiaVersion(),
		clearHistory: false,
		encryptHistory: false,
	};

	return JSON.stringify(payload);
}

async function serveInertiaResponse(
	component: string,
	props: Record<string, any> = {},
): Promise<Response> {
	return new Response(await inertiaPayload(component, props), {
		headers: {
			'Content-Type': 'application/json',
			Vary: 'X-Inertia',
			'X-Inertia': 'true',
		},
		status: 200,
	});
}

function viteDevResponse(): string {
	const viteClientScript = `<script type="module" src="${viteDev}/@vite/client"></script>`;
	const appScript = `<script type="module" src="${viteDev}/assets/js/app.ts"></script>`;

	return `${viteClientScript}\n${appScript}`;
}

async function viteProdResponse(): Promise<string> {
	const manifest = Bun.file('public/build/.vite/manifest.json');

	if (!manifest.exists()) {
		throw new Error('Vite manifest not found. Please run the build process.');
	}

	const files = await manifest.json();

	const appScript = `<script type="module" src="/build/${files['assets/js/app.ts'].file}"></script>`;
	const cssFiles = files['assets/js/app.ts'].css || [];
	const cssLinks = cssFiles
		.map((cssFile: string) => {
			return `<link rel="stylesheet" href="/build/${cssFile}">`;
		})
		.join('\n');

	return `${cssLinks}\n${appScript}`;
}

async function serveResponse(
	component: string,
	props: Record<string, any> = {},
): Promise<Response> {
	const index = Bun.file('assets/index.html');
	const html = await index.text();
	const assets = viteDev ? viteDevResponse() : viteProdResponse();

	const modifiedHtml = html
		.replace('@vite', await assets)
		.replace(
			'@inertia',
			`<div id="app" data-page='${await inertiaPayload(component, props)}'></div>`,
		);

	return new Response(modifiedHtml, {
		headers: { 'Content-Type': 'text/html' },
		status: 200,
	});
}

export async function view(
	component: string,
	props: Record<string, any> = {},
): Promise<Response> {
	if (await isInertiaRequest()) {
		return serveInertiaResponse(component, props);
	}

	return serveResponse(component, props);
}
