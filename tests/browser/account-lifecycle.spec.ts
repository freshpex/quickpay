import { test, expect } from "@playwright/test";
import "dotenv/config";
import pg from "pg";

test("real HTTP account lifecycle and customer pages", async ({
  page,
  baseURL,
}) => {
  test.skip(
    process.env.E2E_REAL_AUTH !== "true",
    "Requires qa:serve and the disposable local test database.",
  );
  expect(baseURL).toBe("http://localhost:3100");
  const dbUrl = new URL(
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL!,
  );
  if (!process.env.TEST_DATABASE_URL) dbUrl.pathname = "/quickpay_test";
  expect(["localhost", "127.0.0.1"]).toContain(dbUrl.hostname);
  expect(dbUrl.pathname).toMatch(/_test$/);
  const db = new pg.Pool({ connectionString: dbUrl.toString() });
  const email = `http-${crypto.randomUUID()}@quickpay.test`;
  const phone = `0803${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const password = "BrowserStrongPassword123!";
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500)
      serverErrors.push(
        `${response.status()} ${new URL(response.url()).pathname}`,
      );
  });
  try {
    await page.goto("/sign-up");
    await page.getByLabel("Full name", { exact: true }).fill("Account Journey");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Nigerian phone number").fill(phone);
    await page.locator("#password").fill(password);
    await page.locator("#confirmPassword").fill(password);
    await page.getByRole("checkbox").check();
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/auth/sign-up/email") &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    expect((await response).status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: "Check your email." }),
    ).toBeVisible();
    const user = (
      await db.query(
        "SELECT email_verified,phone_number,role FROM users WHERE email=$1",
        [email],
      )
    ).rows[0];
    expect(user).toMatchObject({
      email_verified: false,
      phone_number: `+234${phone.slice(1)}`,
      role: "customer",
    });
    const duplicate = await page.request.post("/api/v1/auth/sign-up/email", {
      data: {
        name: "Another Account",
        email: `another-${email}`,
        phoneNumber: phone,
        password,
        confirmPassword: password,
        terms: true,
      },
    });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error.fields.phoneNumber).toBeTruthy();

    async function openMailLink(subject: string) {
      const mail = (
        await db.query(
          "SELECT payload FROM jobs WHERE type='email' AND payload->>'to'=$1 AND payload->>'subject'=$2 ORDER BY created_at DESC LIMIT 1",
          [email, subject],
        )
      ).rows[0];
      expect(mail).toBeTruthy();
      const url = new URL(mail.payload.text.match(/https?:\/\/\S+/)[0]);
      expect(url.origin).toBe(baseURL);
      await page.goto(url.toString());
    }
    await openMailLink("Verify your Quick Pay email");
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(
      page.getByRole("heading", { name: /Hello, Account/ }),
    ).toBeVisible();
    for (const [path, heading] of [
      ["/wallet", "Your wallet"],
      ["/bills", "Pay a bill"],
      ["/gift-cards", "Gift cards"],
      ["/transactions", "Your transactions"],
      ["/beneficiaries", "Saved beneficiaries"],
      ["/notifications", "Your updates"],
      ["/settings", "Profile & security"],
      ["/support", "We’re here to help."],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        heading,
      );
      await expect(
        page.getByText("Loading your account…", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("We could not complete this request.", { exact: false }),
      ).toHaveCount(0);
      if (path === "/settings") {
        await page
          .getByLabel("Current login password", { exact: true })
          .fill(password);
        await page
          .getByLabel("New transaction PIN", { exact: true })
          .fill("572904");
        await page
          .getByLabel("Confirm transaction PIN", { exact: true })
          .fill("572904");
        await page
          .getByRole("button", { name: "Set transaction PIN", exact: true })
          .click();
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: "Your transaction PIN is ready." }),
        ).toBeVisible();
        expect(
          await (await page.request.get("/api/v1/security/pin")).json(),
        ).toMatchObject({ configured: true });
        const stored = (
          await db.query(
            "SELECT p.pin_hash FROM transaction_pins p JOIN users u ON u.id=p.user_id WHERE u.email=$1",
            [email],
          )
        ).rows[0];
        expect(stored.pin_hash).not.toBe("572904");
      }
    }
    await page
      .getByLabel("What do you need help with?")
      .fill("Account setup question");
    await page
      .getByLabel("Tell us a little more")
      .fill("Please explain how I can manage my account settings.");
    await page
      .getByRole("button", { name: "Send request", exact: true })
      .click();
    await expect(
      page.getByText("Account setup question", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-in\/?$/);
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "If that email is registered" }),
    ).toBeVisible();
    await openMailLink("Reset your Quick Pay password");
    await page.locator("#password").fill("UpdatedStrongPassword456!");
    await page.locator("#confirmPassword").fill("UpdatedStrongPassword456!");
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(
      page.getByText("Your password has been updated.", { exact: false }),
    ).toBeVisible();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.locator("#password").fill("UpdatedStrongPassword456!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    expect(pageErrors).toEqual([]);
    expect(serverErrors).toEqual([]);
  } finally {
    await db.end();
  }
});
