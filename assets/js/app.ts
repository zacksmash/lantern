import '../css/app.css';

import { createInertiaApp } from '@inertiajs/vue3';
import type { DefineComponent } from 'vue';
import { createApp, h } from 'vue';

const appName = import.meta.env.VITE_APP_NAME;

createInertiaApp({
	title: (title) => `${appName} :: ${title ? title : 'Welcome'}`,
	resolve: (name: string) => {
		const pages = import.meta.glob('./Pages/**/*.vue', {
			eager: true,
		}) as Record<string, { default: DefineComponent }>;
		return pages[`./Pages/${name}.vue`]?.default;
	},
	setup({ el, App, props, plugin }) {
		createApp({ render: () => h(App, props) })
			.use(plugin)
			.mount(el);
	},
});
