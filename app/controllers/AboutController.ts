import { view } from '@core/Response';
import Controller from './Controller';

export default class AboutController extends Controller {
	public async index() {
		return view('About');
	}
}
