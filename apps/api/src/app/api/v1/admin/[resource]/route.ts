import { endpoint } from "@quickpay/server/shared/infrastructure/http";
import {
  adminList,
  adminUpdate,
} from "@quickpay/server/v1/modules/admin/routes/handler";
export const runtime = "nodejs";
export const GET = endpoint(
  async (req, ctx) => adminList(req, (await ctx.params).resource),
  true,
);
export const PATCH = endpoint(
  async (req, ctx) => adminUpdate(req, (await ctx.params).resource),
  true,
);
