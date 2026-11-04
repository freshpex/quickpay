export function maintenanceDatabaseUrl(
  settings: Record<string, string | undefined>,
) {
  const runtime = settings.DATABASE_URL;
  const direct =
    settings.DATABASE_URL_UNPOOLED ||
    settings.DATABASE_URL_UNPOOLING ||
    settings.DIRECT_URL;
  if (!runtime && !direct)
    throw new Error(
      "Configure DATABASE_URL and a direct DATABASE_URL_UNPOOLED for migrations.",
    );
  const selected = new URL(direct || runtime!);
  if (
    selected.hostname.endsWith(".neon.tech") &&
    selected.hostname.includes("-pooler")
  )
    throw new Error(
      "Migrations and seed require the direct Neon URL. Set DATABASE_URL_UNPOOLED (DATABASE_URL_UNPOOLING is also supported).",
    );
  if (direct && runtime) {
    const current = new URL(runtime);
    if (
      current.hostname.replace(/-pooler(?=\.)/, "") !== selected.hostname ||
      current.pathname !== selected.pathname ||
      current.username !== selected.username
    )
      throw new Error(
        "Pooled and direct database URLs must identify the same database and Neon endpoint.",
      );
  }
  return selected.toString();
}
