import AboutController from '@app/controllers/AboutController';
import HomeController from '@app/controllers/HomeController';
import { view } from '@core/Response';
import type { Router } from '@core/Routing/Router';

export function routes(route: Router) {
	// Using Controller@method
	route.get('/', [HomeController, 'index']).name('home.index');

	// Using invokable Controller
	route.get('/about', AboutController).name('about.index');

	// Directly returning a view
	route.get('/test', (req) => view('Test', { url: req.url })).name('test.index');
}
