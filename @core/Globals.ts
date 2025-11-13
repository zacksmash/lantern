declare global {
  var dd: (...args: any[]) => Response;
}

globalThis.dd = function (...args: any[]): Response {
  const output = args.map(arg => {
    try {
      return typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean'
        ? arg
        : JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }).join('\n\n').trim();

  const html = `
    <html>
      <head>
        <title>Debug Dump</title>
        <style>
          body { background:#111; color:#f8f8f2; font-family: monospace; padding:20px; }
          pre { white-space: pre-wrap; word-break: break-word; background:#222; padding:20px; border-radius:8px; }
        </style>
      </head>
      <body>
        <h1>Debug Dump</h1>
        <pre>${output}</pre>
      </body>
    </html>
  `;

  throw new Response(html, {
    status: 500,
    headers: { "Content-Type": "text/html" }
  });
};

export {};
