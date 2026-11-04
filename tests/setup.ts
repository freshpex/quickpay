import "dotenv/config";
// Tests use a separate local database, never the application database.
const original = new URL(
  process.env.TEST_DATABASE_URL || process.env.DATABASE_URL!,
);
if (
  !process.env.TEST_DATABASE_URL &&
  !["localhost", "127.0.0.1"].includes(original.hostname)
)
  throw new Error("Set an explicit disposable TEST_DATABASE_URL.");
if (!process.env.TEST_DATABASE_URL) original.pathname = "/quickpay_test";
if (!/^[a-zA-Z][a-zA-Z0-9_]*_test$/.test(original.pathname.slice(1)))
  throw new Error("The disposable database name must end in _test.");
process.env.DATABASE_URL = original.toString();
process.env.PAYMENT_MODE = "disabled";
process.env.PUSH_ENABLED = "false";
process.env.EXPO_ACCESS_TOKEN = "";
process.env.SMS_ENABLED = "false";
process.env.UPLOAD_STORAGE = "database";
