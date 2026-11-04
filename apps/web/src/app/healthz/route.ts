export async function GET() {
  // Website liveness must not fail while the free API is waking from sleep.
  // deploy:verify separately checks database and worker readiness through the API.
  return Response.json(
    { status: "ok" },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
