import { Route } from '@core/Routing/Facades/Route'
import { IndexController } from '@app/controllers/IndexController'

Route.get('/', IndexController).name('index');
