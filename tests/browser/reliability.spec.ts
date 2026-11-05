import { test, expect } from "@playwright/test";

test("landing header remains visible while scrolling on mobile and desktop", async ({
  page,
}) => {
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const section of [
      "#everyday",
      "#how-it-works",
      "#rewards",
      "footer",
    ]) {
      await page.locator(section).scrollIntoViewIfNeeded();
      const header = page.locator("header");
      await expect(header).toBeVisible();
      const bounds = await header.boundingBox();
      expect(bounds?.y).toBe(0);
      await expect(
        header.getByRole("link", { name: "Quick Pay home" }),
      ).toBeVisible();
    }
    if (width === 360) {
      await page
        .getByRole("button", { name: "Open menu", exact: true })
        .click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Your everyday" })
        .click();
      await expect(
        page.getByRole("button", { name: "Open menu", exact: true }),
      ).toBeVisible();
    }
    await page.screenshot({
      path: `docs/screenshots/sticky-header-${width}.png`,
    });
  }
});
test("signup focuses invalid input and shows server field errors beside the correct field", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Full name", { exact: true }).fill("Account Test");
  await page.getByLabel("Email address").fill("account@example.com");
  await page.getByLabel("Nigerian phone number").fill("08031234567");
  await page.locator("#password").fill("StrongPassword123!");
  await page.locator("#confirmPassword").fill("StrongPassword123!");
  await page.getByRole("checkbox").check();
  await page.route("**/auth/sign-up/email", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "PHONE_IN_USE",
          message: "This phone number is already linked to an account.",
          fields: {
            phoneNumber: ["This phone number is already linked to an account."],
          },
        },
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("#phoneNumber")).toBeFocused();
  await expect(page.locator("#phoneNumber")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#phoneNumber-error")).toBeVisible();
  await page.screenshot({
    path: "docs/screenshots/signup-field-error.png",
    fullPage: true,
  });
});
test("customer pages do not display development or fabricated-data disclaimers", async ({
  page,
}) => {
  for (const path of ["/", "/terms", "/privacy", "/sign-up", "/support-info"]) {
    await page.goto(path);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(
      /\b(mock|illustration|dummy|fake)\b|in development|development policy|before public launch|await commercial setup|catalog preview/i,
    );
  }
});
