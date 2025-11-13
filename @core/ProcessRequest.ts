import { HttpKernel } from '@core/HttpKernel';
import { RequestContext } from '@core/RequestContext';

const HandleResponse = async (request: Request): Promise<Response> => {
  return await RequestContext.run(request,
    async () => await new HttpKernel(request).handle()
  );
}

const HandleError = async (error: any): Promise<Response> => {
  const environment = env('APP_ENV', 'production');

  if (environment === 'development') {
    if (error instanceof Response) {
      return error;
    }

    throw error;
  }

  return new Response('Internal Server Error', { status: 500 });
}

export { HandleResponse, HandleError };
