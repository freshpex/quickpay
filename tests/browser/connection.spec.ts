import { test, expect, type Page } from "@playwright/test";
async function coldApi(page: Page) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const posts: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/health")) {
      await gate;
      return route.fulfill({ json: { status: "ok" } });
    }
    if (route.request().method() === "POST") posts.push(path);
    if (path.endsWith("/auth/sign-in/email"))
      return route.fulfill({
        status: 401,
        json: {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid credentials",
        },
      });
    return route.fulfill({ json: {} });
  });
  return { release, posts };
}
test("login waits for readiness, keeps the entered details and submits once", async ({
  page,
}) => {
  const api = await coldApi(page);
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("connection@example.com");
  await page.getByLabel("Password", { exact: true }).fill("LongPassword123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Securing connection…", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(api.posts).toHaveLength(0);
  await expect(page.getByLabel("Email address")).toHaveValue(
    "connection@example.com",
  );
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/connection-sign-in.png",
    fullPage: true,
  });
  api.release();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Your email or password is incorrect",
  );
  expect(api.posts).toEqual(["/api/v1/auth/sign-in/email"]);
  await expect(page.getByRole("status")).toHaveCount(0);
});
test("signup on a small phone keeps the form while connecting and continues after readiness", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const api = await coldApi(page);
  await page.goto("/sign-up");
  await page.getByLabel("Full name", { exact: true }).fill("Connection Test");
  await page.getByLabel("Email address").fill("connection@example.com");
  await page.getByLabel("Nigerian phone number").fill("08012345678");
  await page.locator("#password").fill("LongPassword123!");
  await page.locator("#confirmPassword").fill("LongPassword123!");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Securing connection…", exact: true }),
  ).toBeDisabled();
  expect(api.posts).toHaveLength(0);
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Connection Test",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.screenshot({
    path: "docs/screenshots/connection-sign-up-360.png",
    fullPage: true,
  });
  api.release();
  await expect(
    page.getByRole("heading", { name: "Check your email." }),
  ).toBeVisible();
  expect(api.posts).toEqual(["/api/v1/auth/sign-up/email"]);
});
test("login continues automatically after a wake-up longer than two minutes", async ({
  page,
}) => {
  await page.clock.install();
  let awake = false;
  const posts: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/health"))
      return awake
        ? route.fulfill({ json: { status: "ok" } })
        : route.fulfill({ status: 503, body: "Service starting" });
    if (route.request().method() === "POST") posts.push(path);
    return route.fulfill({
      status: 401,
      json: { code: "INVALID_EMAIL_OR_PASSWORD" },
    });
  });
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("connection@example.com");
  await page.getByLabel("Password", { exact: true }).fill("LongPassword123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.clock.runFor(125000);
  await expect(
    page.getByRole("button", { name: "Waiting for service…", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("form").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByLabel("Email address")).toHaveValue(
    "connection@example.com",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "LongPassword123!",
  );
  expect(posts).toEqual([]);
  awake = true;
  await expect
    .poll(async () => {
      await page.clock.runFor(3001);
      return posts.length;
    })
    .toBe(1);
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Your email or password is incorrect",
  );
  expect(posts).toEqual(["/api/v1/auth/sign-in/email"]);
});
