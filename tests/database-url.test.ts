import { expect, it } from "vitest";
import { maintenanceDatabaseUrl } from "../scripts/database-url";
it("uses the direct Neon URL and recognizes the existing UNPOOLING alias", () => {
  const pooled =
      "postgresql://owner:secret@ep-example-pooler.region.neon.tech/app?sslmode=require",
    direct = pooled.replace("-pooler", "");
  expect(
    maintenanceDatabaseUrl({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLING: direct,
    }),
  ).toBe(direct);
  expect(() => maintenanceDatabaseUrl({ DATABASE_URL: pooled })).toThrow(
    "direct Neon",
  );
  expect(() =>
    maintenanceDatabaseUrl({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: direct.replace("ep-example", "ep-other"),
    }),
  ).toThrow("same database");
});
it("keeps ordinary direct local PostgreSQL URLs supported", () => {
  expect(
    maintenanceDatabaseUrl({
      DATABASE_URL: "postgresql://local:local@localhost:55432/quickpay",
    }),
  ).toContain("localhost:55432/quickpay");
});
