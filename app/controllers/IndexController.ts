export class IndexController {
  invoke(request: Request): Response {
    return new Response('<div>Index Controller Response</div>', {
      headers: { 'Content-Type': 'text/html' },
      status: 200
    });
  }
}
