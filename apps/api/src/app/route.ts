export async function GET() {
  return Response.json({
    service: "Quick Pay API",
    status: "ok",
    health: "/api/v1/health",
    docs: "/docs",
  });
}
