import { pool } from "./index";
const sandbox =
  process.env.PAYMENT_MODE === "sandbox" &&
  process.env.VTPASS_ENV === "sandbox";
const catalogOnly = process.argv.includes("--catalog-only");
if (
  !catalogOnly &&
  (process.env.NODE_ENV === "production" ||
    process.env.SEED_DEVELOPMENT !== "true")
)
  throw new Error("Seed requires SEED_DEVELOPMENT=true outside production.");
const services = [
  ["mtn", "MTN airtime", "airtime", "/media/mtn.jpg", false],
  ["airtel", "Airtel airtime", "airtime", "/media/airtel.svg", false],
  ["glo", "Glo airtime", "airtime", null, false],
  ["etisalat", "9mobile airtime", "airtime", null, false],
  ["mtn-data", "MTN data", "data", "/media/mtn.jpg", false],
  ["airtel-data", "Airtel data", "data", "/media/airtel.svg", false],
  ["ikeja-electric", "Ikeja Electric", "electricity", null, true],
  ["eko-electric", "Eko Electricity", "electricity", null, true],
  ["dstv", "DStv", "television", null, true],
  ["gotv", "GOtv", "television", null, true],
  ["smile-direct", "Smile internet", "internet", null, true],
  ["waec", "WAEC result checker", "education", null, false],
];
for (const [id, name, category, logo, validation] of services)
  await pool.query(
    "INSERT INTO service_catalog(id,name,category,provider,logo,min,max,requires_validation,enabled) VALUES($1,$2,$3,'vtpass',$4,5000,10000000,$5,$6) ON CONFLICT(id) DO UPDATE SET enabled=CASE WHEN $6 THEN true ELSE service_catalog.enabled END",
    [id, name, category, logo, validation, sandbox],
  );
// Deliberately disabled, illustrative inventory pending commercial onboarding.
if (!catalogOnly)
  for (const [id, brand] of [
    ["apple-us", "Apple"],
    ["amazon-us", "Amazon"],
    ["steam-us", "Steam"],
  ])
    await pool.query(
      "INSERT INTO gift_products(id,brand,region,card_type,rate_kobo,min_units,max_units) VALUES($1,$2,'US','digital',100,10,500) ON CONFLICT DO NOTHING",
      [id, brand],
    );
console.log(
  catalogOnly
    ? `Seeded ${sandbox ? "enabled sandbox" : "disabled"} bill-service catalog only. No gift rates, users, balances, transactions or reward rules created.`
    : `Seeded ${sandbox ? "enabled sandbox" : "disabled"} service inventory. No users, balances, transactions or active reward claims created.`,
);
await pool.end();
