export async function GET() {
  const origin =
    process.env.API_ORIGIN ||
    (process.env.API_HOSTPORT
      ? `http://${process.env.API_HOSTPORT}`
      : "http://localhost:3001");
  try {
    const result = await fetch(`${origin}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return Response.json(
      { status: result.ok ? "ok" : "unavailable" },
      {
        status: result.ok ? 200 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
