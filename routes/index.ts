import AboutController from '@app/controllers/AboutController';
import HomeController from '@app/controllers/HomeController';
import type { Router } from '@core/Routing/Router';

export function routes(route: Router) {
	route.get('/', [HomeController, 'index']).name('home.index');
	route.get('/about', [AboutController, 'index']).name('about.index');
}
