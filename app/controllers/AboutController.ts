import { view } from '@core/Response';
import Controller from './Controller';

export default class AboutController extends Controller {
	public async invoke() {
		return view('About');
	}
}
