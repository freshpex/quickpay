export {};
const providerOrigin = process.env.QUICKPAY_TEST_PROVIDER_ORIGIN;
if (!providerOrigin) throw new Error("Missing local QA provider origin.");
const database = new URL(process.env.DATABASE_URL!);
const gateway = new URL(providerOrigin);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  !database.pathname.endsWith("_test") ||
  gateway.hostname !== "127.0.0.1" ||
  process.env.E2E_PROVIDER_FIXTURES !== "true"
)
  throw new Error(
    "Provider fixtures are restricted to disposable local QA databases.",
  );
const fetcher = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const provider =
    url.hostname === "api.paystack.co"
      ? "paystack"
      : url.hostname === "sandbox.vtpass.com"
        ? "vtpass"
        : url.hostname === "api.mailjet.com"
          ? "mailjet"
          : null;
  if (provider)
    return fetcher(
      new URL(`/${provider}${url.pathname}${url.search}`, gateway),
      init,
    );
  if (!["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error("Unexpected external request in provider QA.");
  return fetcher(input, init);
};
