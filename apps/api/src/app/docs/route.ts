export async function GET() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quick Pay API reference</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.32.0/swagger-ui.css"></head><body><noscript><a href="/api/v1/openapi">Download OpenAPI JSON</a></noscript><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5.32.0/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/api/v1/openapi',dom_id:'#swagger-ui',persistAuthorization:false,tryItOutEnabled:false})</script></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
