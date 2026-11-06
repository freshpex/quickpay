import { createRequire } from "node:module";
import { expect, it } from "vitest";
const mobile = createRequire(
  new URL("../apps/mobile/package.json", import.meta.url),
);
const router = createRequire(mobile.resolve("expo-router/package.json"));
it("keeps Expo Router query parsing compatible with the patched URI decoder", () => {
  const query = router("query-string");
  expect(
    query.parse("name=Quick%20Pay&currency=%E2%82%A6&next=%2Fwallet"),
  ).toEqual(
    expect.objectContaining({
      name: "Quick Pay",
      currency: "₦",
      next: "/wallet",
    }),
  );
  expect(() => query.parse("bad=%E0%A4%A&value=%25%ZZ")).not.toThrow();
  expect(query.stringify({ next: "/wallet" })).toBe("next=%2Fwallet");
});
