import { view } from '@core/Response';
import Controller from './Controller';

export default class HomeController extends Controller {
	public async index() {
		return view('Index', { name: 'Lantern' });
	}
}
