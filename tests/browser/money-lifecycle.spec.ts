import { test, expect } from "@playwright/test";
import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";

test("real API and worker handle PIN setup, checkout, late confirmation, bank review, withdrawal and bill settlement", async ({
  page,
  baseURL,
  request,
}) => {
  test.skip(
    process.env.E2E_PROVIDER_FIXTURES !== "true",
    "Requires the guarded local provider QA harness.",
  );
  test.setTimeout(240000);
  await page.clock.install();
  const url = new URL(process.env.TEST_DATABASE_URL!);
  expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
  expect(url.pathname).toMatch(/_test$/);
  const db = new pg.Pool({ connectionString: url.toString() });
  const email = `money-${crypto.randomUUID()}@quickpay.test`;
  const password = `${crypto.randomUUID()}Aa7!`;
  const pin = "572904";
  const phone = `0803${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function advanceStatus() {
    await page.clock.runFor(30000);
  }
  async function owned(id: string) {
    return (
      await db.query("SELECT status,reference FROM transactions WHERE id=$1", [
        id,
      ])
    ).rows[0];
  }
  async function settled(id: string) {
    await expect
      .poll(async () => (await owned(id))?.status, { timeout: 45000 })
      .toBe("successful");
    await advanceStatus();
    await expect(page.getByText("successful", { exact: true })).toBeVisible();
  }
  try {
    const signup = await request.post("/api/v1/auth/sign-up/email", {
      headers: { origin: baseURL! },
      data: {
        name: "Money Journey",
        email,
        password,
        confirmPassword: password,
        phoneNumber: phone,
        terms: true,
      },
    });
    expect(signup.status()).toBe(200);
    const user = (
      await db.query("SELECT id FROM users WHERE email=$1", [email])
    ).rows[0];
    const mail = (
      await db.query(
        "SELECT payload FROM jobs WHERE type='email' AND payload->>'to'=$1 AND payload->>'subject'='Verify your Quick Pay email' ORDER BY created_at DESC LIMIT 1",
        [email],
      )
    ).rows[0].payload;
    await page.goto(mail.text.match(/https?:\/\/\S+/)[0]);
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/dashboard\/?$/);

    await page.goto("/deposit");
    await expect(
      page.getByText("Set up your transaction PIN to continue", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue to checkout" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Set up PIN and continue" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Set up your PIN below" }),
    ).toBeVisible();
    await page
      .getByLabel("Current login password", { exact: true })
      .fill(password);
    await page.getByLabel("New transaction PIN", { exact: true }).fill(pin);
    await page.getByLabel("Confirm transaction PIN", { exact: true }).fill(pin);
    await page
      .getByRole("button", { name: "Set transaction PIN", exact: true })
      .click();
    await expect(page).toHaveURL(/deposit\/?$/);
    await page.getByLabel("Amount (₦)").fill("1000");
    await page.getByLabel("Transaction PIN", { exact: true }).fill(pin);
    await page.getByRole("button", { name: "Continue to checkout" }).click();
    await expect(page).toHaveURL(/transactions\/detail/);
    const depositId = new URL(page.url()).searchParams.get("id")!;
    await expect(
      page.getByRole("link", { name: "Open secure checkout" }),
    ).toBeVisible({ timeout: 45000 });
    await page
      .getByRole("button", { name: "Check your payment", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await db.query(
              "SELECT count(*)::int AS count FROM jobs WHERE type='verify-provider' AND status='completed' AND payload->>'reference'=$1",
              [(await owned(depositId)).reference],
            )
          ).rows[0].count,
      )
      .toBeGreaterThan(0);
    expect((await owned(depositId)).status).toBe("awaiting_authorization");
    const reference = (await owned(depositId)).reference;
    await page.route("https://checkout.paystack.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><body><h1>Provider checkout fixture</h1><form method="post" action="http://127.0.0.1:3190/__qa/checkout/${encodeURIComponent(reference)}"><button>Complete checkout</button></form></body></html>`,
      }),
    );
    await page.getByRole("link", { name: "Open secure checkout" }).click();
    await expect(
      page.getByRole("heading", { name: "Provider checkout fixture" }),
    ).toBeVisible();
    // Reproduce an old failure while the customer is away at checkout.
    await db.query("UPDATE transactions SET status='failed' WHERE id=$1", [
      depositId,
    ]);
    await page
      .getByRole("button", { name: "Complete checkout", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`transactions/detail.*${depositId}`),
    );
    await settled(depositId);
    expect(
      (
        await db.query(
          "SELECT balance FROM ledger_accounts WHERE user_id=$1 AND bucket='available'",
          [user.id],
        )
      ).rows[0].balance,
    ).toBe("100000");
    await request.post(`http://127.0.0.1:3190/__qa/checkout/${reference}`);
    expect(
      (
        await db.query(
          "SELECT count(*)::int AS count FROM journals WHERE reference=$1",
          [`deposit:${depositId}`],
        )
      ).rows[0].count,
    ).toBe(1);
    await page.getByRole("button", { name: "Receipt options" }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("menuitem", { name: "Download PDF", exact: true })
      .click();
    const pdf = await download;
    expect(
      (await readFile((await pdf.path())!)).subarray(0, 4).toString(),
    ).toBe("%PDF");

    await page.goto("/withdraw");
    await page.getByRole("combobox", { name: "Bank", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search banks" }).fill("QA Test");
    await expect(
      page.getByRole("option", { name: "Another QA Bank" }),
    ).toHaveCount(0);
    await page
      .getByRole("option", { name: "QA Test Bank", exact: true })
      .click();
    await page.getByLabel("Account number").fill("1234567890");
    await page.getByLabel("Amount (₦)").fill("250");
    await page
      .getByRole("button", { name: "Check account and review" })
      .click();
    await expect(
      page.getByText("QA BANK CUSTOMER", { exact: true }),
    ).toBeVisible();
    expect(
      (
        await db.query(
          "SELECT 1 FROM transactions WHERE user_id=$1 AND kind='withdrawal'",
          [user.id],
        )
      ).rowCount,
    ).toBe(0);
    expect(
      (await (await request.get("http://127.0.0.1:3190/__qa/stats")).json())
        .bankResolves,
    ).toBe(2);
    await page.getByLabel("Transaction PIN", { exact: true }).fill(pin);
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page).toHaveURL(/transactions\/detail/);
    const withdrawalId = new URL(page.url()).searchParams.get("id")!;
    await settled(withdrawalId);

    await db.query(
      "INSERT INTO service_catalog(id,name,category,provider,min,max,enabled) VALUES('qa-mtn','QA MTN airtime','airtime','vtpass',5000,10000000,true) ON CONFLICT(id) DO UPDATE SET enabled=true",
    );
    await page.goto("/airtime");
    await page.getByRole("button", { name: /QA MTN airtime/ }).click();
    await page.getByLabel("Nigerian phone number").fill("08031234567");
    await page.getByLabel("Amount (₦)").fill("100");
    await page.getByRole("button", { name: "Review payment" }).click();
    await page.getByLabel("Transaction PIN", { exact: true }).fill(pin);
    await page.getByRole("button", { name: "Confirm and pay" }).click();
    await expect(page).toHaveURL(/transactions\/detail/);
    await settled(new URL(page.url()).searchParams.get("id")!);
    const balances = (
      await db.query(
        "SELECT bucket,balance FROM ledger_accounts WHERE user_id=$1 AND bucket IN ('available','reserved')",
        [user.id],
      )
    ).rows;
    expect(
      Object.fromEntries(balances.map((row) => [row.bucket, row.balance])),
    ).toEqual({ available: "65000", reserved: "0" });
    await page.goto("/settings#transaction-pin");
    await page
      .getByRole("button", { name: "Forgot your transaction PIN?" })
      .click();
    await page
      .getByLabel("Current login password", { exact: true })
      .fill(password);
    await page
      .getByRole("button", { name: "Email me a reset code", exact: true })
      .click();
    let resetMail:
      | { subject: string; text: string; branded: boolean }
      | undefined;
    await expect
      .poll(async () => {
        const mail = (await (
          await request.get("http://127.0.0.1:3190/__qa/mail")
        ).json()) as { subject: string; text: string; branded: boolean }[];
        resetMail = mail.find(
          (item: {
            to?: string;
            subject: string;
            text: string;
            branded: boolean;
          }) =>
            item.to === email && item.subject === "Reset your transaction PIN",
        );
        return !!resetMail;
      })
      .toBe(true);
    expect(resetMail!.branded).toBe(true);
    const code = resetMail!.text.match(/\b\d{6}\b/)![0];
    await page.getByLabel("Code sent to your verified email").fill(code);
    await page
      .getByLabel("New transaction PIN", { exact: true })
      .fill("684207");
    await page
      .getByLabel("Confirm transaction PIN", { exact: true })
      .fill("684207");
    await page
      .getByRole("button", { name: "Reset transaction PIN", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Your transaction PIN has been reset." }),
    ).toBeVisible();
    await page
      .getByLabel("Current login password", { exact: true })
      .fill(password);
    await page
      .getByLabel("Current transaction PIN", { exact: true })
      .fill("684207");
    await page.getByLabel("New transaction PIN", { exact: true }).fill(pin);
    await page.getByLabel("Confirm transaction PIN", { exact: true }).fill(pin);
    await page
      .getByRole("button", { name: "Change transaction PIN", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Your transaction PIN is ready." }),
    ).toBeVisible();
    const emails = (await (
      await request.get("http://127.0.0.1:3190/__qa/mail")
    ).json()) as { to: string; subject: string; branded: boolean }[];
    expect(
      emails.some(
        (item) =>
          item.to === email && item.subject === "New sign-in to Quick Pay",
      ),
    ).toBe(true);
    expect(
      emails.some(
        (item) =>
          item.to === email && item.subject === "Transaction successful",
      ),
    ).toBe(true);
    expect(emails.every((item) => item.branded)).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await db.end();
  }
});
