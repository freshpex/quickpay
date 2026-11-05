import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
test("landing remains readable with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(process.env.E2E_BASE_URL || "http://localhost:3000");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get started" }).first(),
  ).toHaveAttribute("href", "/sign-up/");
  await expect(
    page.getByText(
      "Choose a service. Check who you are paying, the amount and any fees. You stay in control.",
    ),
  ).toBeAttached();
  await context.close();
});

test("scroll scenes visibly stack and show the walking media", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const second = page.locator("#everyday article").nth(1);
  // Centering an already-visible card need not enter the sticky overlap range.
  // Scroll to the second card's real sticky threshold, then wait for hydration /
  // IntersectionObserver / Motion to settle before measuring visible overlap.
  await second.evaluate((node) =>
    window.scrollTo({
      top: window.scrollY + node.getBoundingClientRect().top - 118,
      behavior: "instant",
    }),
  );
  await expect
    .poll(() =>
      page
        .locator("#everyday article")
        .evaluateAll(
          (nodes) =>
            nodes[0].getBoundingClientRect().bottom -
            nodes[1].getBoundingClientRect().top,
        ),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: "docs/screenshots/stacked-cards.png" });
  await page
    .getByRole("heading", { name: "Your day has places to be." })
    .scrollIntoViewIfNeeded();
  await expect(page.locator("video")).toBeVisible();
  await expect(page.locator("video")).toHaveJSProperty("readyState", 4);
  await page.screenshot({ path: "docs/screenshots/walking-story.png" });
});
const session = {
  user: {
    id: "browser-test",
    name: "Browser Test",
    email: "browser@quickpay.test",
    role: "customer",
  },
  session: { id: "test-session" },
};
const transaction = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "browser-test",
  kind: "payment",
  status: "processing",
  amount: "100000",
  fee: "0",
  currency: "NGN",
  reference: "browser-illustration",
  createdAt: new Date().toISOString(),
  serviceId: "mtn",
  details: { beneficiary: "08031234567" },
};
// UI fixtures exist only in the browser test harness, never in the runtime adapters.
async function fixture(
  page: Page,
  extra: (
    path: string,
    method: string,
    body: Record<string, unknown>,
  ) => unknown = () => undefined,
) {
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname.replace("/api/v1", "");
    const body = req.postDataJSON() || {};
    const custom = extra(path, req.method(), body);
    const data =
      custom ??
      (path === "/security/pin"
        ? { configured: true }
        : path === "/health"
          ? { status: "ok" }
          : path === "/admin/access"
            ? { allowed: true, mfaEnabled: true }
            : path === "/auth/get-session"
              ? session
              : path === "/profile"
                ? { user: { name: "Browser Test", email_verified: true } }
                : path === "/wallet"
                  ? {
                      available: "2500000",
                      reserved: "0",
                      rewards: "0",
                      reward_debt: "0",
                      currency: "NGN",
                    }
                  : path.startsWith("/payments/")
                    ? { transaction }
                    : path === "/payments"
                      ? { transactions: [] }
                      : {});
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
}
test("landing renders across all requested widths with working local media", async ({
  page,
}) => {
  await mkdir("docs/screenshots", { recursive: true });
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Less paying.",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator('img[src="/media/lagos-woman.jpg"]'),
    ).toHaveJSProperty("naturalWidth", 1200);
    if (width === 1440) {
      await page.locator("#gift-cards").scrollIntoViewIfNeeded();
      await page.locator("#rewards").scrollIntoViewIfNeeded();
      await page.locator("main img").evaluateAll(async (imgs) => {
        await Promise.all(
          imgs.map((img) => {
            (img as HTMLImageElement).loading = "eager";
            return (img as HTMLImageElement).decode().catch(() => {});
          }),
        );
      });
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({
      path: `docs/screenshots/landing-${width}.png`,
      fullPage: width === 1440,
    });
  }
});
test("normal motion story changes state, and reduced motion keeps readable content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: /Keep the receipt/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Keep the receipt/ }).click();
  await expect(page.getByText("A little more peace of mind.")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(
    page.getByText("Create your account, verify your contact"),
  ).toBeVisible();
  expect(await page.locator("video").count()).toBe(0);
});
test("landing retains usable content when media fails", async ({ page }) => {
  await page.route("**/media/**", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get started" }).first(),
  ).toBeVisible();
  await page.locator("#gift-cards").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: /More to give/ }),
  ).toBeVisible();
});

test("brand lockups, tab icons, home-screen manifest and share metadata load", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const headerLogo = page
    .locator("header")
    .getByRole("img", { name: "Quick Pay", exact: true });
  await expect(headerLogo).toHaveAttribute("src", "/brand/header-light.svg");
  await expect(headerLogo).toHaveJSProperty("complete", true);
  const footerLogo = page
    .locator("footer")
    .getByRole("img", { name: "Quick Pay", exact: true });
  await footerLogo.scrollIntoViewIfNeeded();
  await expect(footerLogo).toHaveAttribute("src", "/brand/footer-dark.svg");
  await expect(footerLogo).toHaveJSProperty("naturalWidth", 2180);
  await expect(
    page.locator('header a[aria-label="Quick Pay home"]'),
  ).toHaveText("");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    "content",
    "#6D28D9",
  );
  for (const selector of [
    'link[rel="icon"][type="image/svg+xml"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="manifest"]',
  ]) {
    const href = await page.locator(selector).getAttribute("href");
    expect(href).toBeTruthy();
    expect((await request.get(href!)).ok()).toBe(true);
  }
  expect((await request.get("/favicon.ico")).ok()).toBe(true);
  const manifest = await (await request.get("/brand/site.webmanifest")).json();
  expect(manifest.theme_color).toBe("#6D28D9");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
  const ogUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(ogUrl).toBeTruthy();
  const social = await request.get(ogUrl!);
  expect(social.ok()).toBe(true);
  expect(social.headers()["content-type"]).toContain("image/png");
  await mkdir("docs/screenshots", { recursive: true });
  await writeFile("docs/screenshots/social-preview.png", await social.body());
  const twitterUrl = await page
    .locator('meta[name="twitter:image"]')
    .getAttribute("content");
  expect((await request.get(twitterUrl!)).ok()).toBe(true);
});

test("original logos fit authentication and customer desktop and mobile surfaces", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/sign-in");
  await expect(page.locator('aside img[alt="Quick Pay"]')).toHaveAttribute(
    "src",
    "/brand/header-dark.svg",
  );
  await page.screenshot({
    path: "docs/screenshots/brand-auth-desktop.png",
    fullPage: true,
  });
  await fixture(page);
  await page.goto("/wallet");
  const sidebarLogo = page.locator('aside img[alt="Quick Pay"]');
  await expect(sidebarLogo).toBeVisible();
  await expect(sidebarLogo).toHaveAttribute("src", "/brand/header-light.svg");
  await page.screenshot({
    path: "docs/screenshots/brand-wallet-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.locator('img[src="/brand/mobile-headers/header-light.svg"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("signup password buttons, confirmation and unchecked terms validate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-up");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByLabel("Full name", { exact: true }).fill("Browser Test");
  await page.getByLabel("Email address").fill("browser@example.com");
  await page.getByLabel("Nigerian phone number").fill("08031234567");
  await page.locator("#password").fill("StrongPassword123!");
  await page.locator("#confirmPassword").fill("DifferentPassword123!");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.locator("#password")).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Show confirm password", exact: true })
    .click();
  await expect(page.locator("#confirmPassword")).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Accept the Terms and Privacy Policy to continue."),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByText("Your passwords do not match.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Terms and Conditions" }),
  ).toHaveAttribute("href", "/terms/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/signup-390.png",
    fullPage: true,
  });
});
test("bill wizard reviews beneficiary, fee and total then shows pending state", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await fixture(page, (path, method, body) => {
    if (path === "/catalog")
      return {
        services: [
          {
            id: "mtn",
            name: "MTN airtime",
            category: "airtime",
            provider: "vtpass",
            enabled: true,
            available: true,
            min: "5000",
            max: "10000000",
            fee: "0",
            requiresValidation: false,
          },
        ],
      };
    if (path === "/payments" && method === "POST") {
      submitted = body;
      return { transaction };
    }
  });
  await page.goto("/airtime");
  await page.getByRole("button", { name: /MTN airtime/ }).click();
  await page.getByLabel("Nigerian phone number").fill("08031234567");
  await page.getByLabel("Amount (₦)").fill("1000");
  await page.getByRole("button", { name: "Review payment" }).click();
  await expect(page.getByText("₦1,000.00").first()).toBeVisible();
  await page.getByLabel("Transaction PIN", { exact: true }).fill("572904");
  await page.getByRole("button", { name: "Confirm and pay" }).click();
  await expect(page).toHaveURL(/\/transactions\//);
  await expect(page.getByText("processing", { exact: true })).toBeVisible();
  expect(submitted?.amount).toBe("100000");
});
test("withdrawal validates bank details before authorization and reservation", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  await fixture(page, (path, method, body) => {
    if (path === "/banks")
      return {
        banks: [
          { name: "Browser test bank", code: "999" },
          { name: "Another bank", code: "888" },
        ],
      };
    if (path === "/banks/resolve")
      return {
        id: "22222222-2222-4222-8222-222222222222",
        name: "BROWSER TEST",
      };
    if (path === "/withdrawals" && method === "POST") {
      submitted = body;
      return { transaction: { ...transaction, kind: "withdrawal" } };
    }
  });
  await page.goto("/withdraw");
  await page.getByLabel("Search banks").fill("Browser");
  await expect(page.getByRole("option", { name: "Another bank" })).toHaveCount(
    0,
  );
  await page.getByLabel("Bank", { exact: true }).selectOption("999");
  await page.getByLabel("Account number").fill("1234567890");
  await page.getByLabel("Amount (₦)").fill("1000");
  await page.getByRole("button", { name: "Check account and review" }).click();
  await expect(page.getByText("BROWSER TEST", { exact: true })).toBeVisible();
  await page.getByLabel("Transaction PIN", { exact: true }).fill("572904");
  await page.getByRole("button", { name: "Confirm withdrawal" }).click();
  await expect(page).toHaveURL(/transactions/);
  expect(submitted?.validationId).toBe("22222222-2222-4222-8222-222222222222");
});
test("admin can preview and save a structured reward-rule version", async ({
  page,
}) => {
  let saved: Record<string, unknown> | undefined;
  await fixture(page, (path, method, body) => {
    if (path === "/admin/reward-rules") {
      if (method === "POST") saved = body;
      return { rules: [], version: 1 };
    }
  });
  await page.goto("/admin/reward-rules");
  await expect(
    page.getByRole("heading", { name: "Referral & reward rules" }),
  ).toBeVisible();
  await page.getByLabel("Campaign name").fill("Browser preview campaign");
  await page.getByRole("button", { name: "Save new rule version" }).click();
  await expect.poll(() => saved?.name).toBe("Browser preview campaign");
  expect(saved?.type).toBe("percentage");
  expect(saved?.value).toBe("100");
  await page.screenshot({
    path: "docs/screenshots/admin-rewards.png",
    fullPage: true,
  });
});
test("customer mobile navigation opens and leads to wallet", async ({
  page,
}) => {
  await fixture(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Hello/ })).toBeVisible();
  await page.getByRole("button", { name: "Open account menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Account navigation", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Account navigation", exact: true })
    .getByRole("link", { name: "Wallet", exact: true })
    .click();
  await expect(page).toHaveURL(/wallet/);
  await expect(
    page.getByRole("heading", { name: "Your wallet" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/wallet-360.png",
    fullPage: true,
  });
});
test("unauthenticated API and unavailable provider operations fail closed", async ({
  request,
}) => {
  const response = await request.get("/api/v1/wallet");
  expect(response.status()).toBe(401);
  const webhook = await request.post("/api/v1/webhooks/paystack", {
    data: { event: "charge.success" },
  });
  expect(webhook.status()).toBe(401);
});

test("transaction status refreshes quietly after thirty seconds and receipts download as files", async ({
  page,
}) => {
  await page.clock.install();
  let completed = false;
  await fixture(page, (path) =>
    path === `/payments/${transaction.id}`
      ? {
          transaction: {
            ...transaction,
            status: completed ? "successful" : "processing",
          },
        }
      : undefined,
  );
  await page.route("**/receipt?format=pdf", (route) =>
    route.fulfill({
      contentType: "application/pdf",
      body: Buffer.from("%PDF-1.7\nReceipt fixture"),
    }),
  );
  await page.goto(`/transactions/detail?id=${transaction.id}`);
  await expect(
    page.getByText(transaction.reference, { exact: true }),
  ).toBeVisible();
  const original = await page
    .getByText(transaction.reference, { exact: true })
    .elementHandle();
  completed = true;
  await page.clock.runFor(30000);
  await expect(page.getByText("successful", { exact: true })).toBeVisible();
  expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
  await page.getByRole("button", { name: "Receipt options" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("menuitem", { name: "Download PDF", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    `QuickPay-receipt-${transaction.id}.pdf`,
  );
});

test("missing PIN redirects to setup and resumes deposit after saving", async ({
  page,
}) => {
  let configured = false;
  await fixture(page, (path, method, body) => {
    if (path === "/security/pin") {
      if (method === "POST") {
        expect(body).toMatchObject({
          password: "StrongPassword123!",
          newPin: "572904",
          confirmPin: "572904",
        });
        configured = true;
        return { message: "Your transaction PIN is ready." };
      }
      return { configured };
    }
    if (path === "/wallet/capabilities")
      return {
        deposits: true,
        withdrawals: true,
        depositMethods: ["card"],
        minimumDeposit: "10000",
        maximumDeposit: "100000000",
        withdrawalFee: "0",
      };
  });
  await page.goto("/deposit");
  await expect(page).toHaveURL(/settings\/?\?returnTo=.*#transaction-pin/);
  await page
    .getByLabel("Current login password", { exact: true })
    .fill("StrongPassword123!");
  await page.getByLabel("New transaction PIN", { exact: true }).fill("572904");
  await page
    .getByLabel("Confirm transaction PIN", { exact: true })
    .fill("572904");
  await page
    .getByRole("button", { name: "Set transaction PIN", exact: true })
    .click();
  await expect(page).toHaveURL(/\/deposit\/?$/);
  await expect(
    page.getByLabel("Transaction PIN", { exact: true }),
  ).toBeEditable();
});

test("authenticator setup explains existing password and displays a local QR code", async ({
  page,
}) => {
  await fixture(page, (path) => {
    if (path === "/auth/two-factor/enable")
      return {
        totpURI:
          "otpauth://totp/Quick%20Pay:browser?secret=JBSWY3DPEHPK3PXP&issuer=Quick%20Pay",
        backupCodes: ["backup-one", "backup-two"],
      };
  });
  await page.goto("/settings#authenticator");
  await expect(
    page.getByText(/First enter your existing Quick Pay login password/),
  ).toBeVisible();
  await page
    .getByLabel("Existing login password", { exact: true })
    .fill("StrongPassword123!");
  await page
    .getByRole("button", { name: "Set up authenticator", exact: true })
    .click();
  await expect(page.locator("#authenticator svg")).toBeVisible();
  await expect(
    page.getByLabel("Six-digit code generated by your authenticator"),
  ).toBeVisible();
  await expect(
    page.getByText("JBSWY3DPEHPK3PXP", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/quickpay-security-settings.png",
    fullPage: true,
  });
});
