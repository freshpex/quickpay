import { z } from "zod";
import { env } from "../../../../shared/infrastructure/env";
const ticket = z.object({
  status: z.enum(["ok", "error"]),
  id: z.string().optional(),
  details: z.object({ error: z.string().optional() }).optional(),
});
export async function expoPush(path: "send" | "getReceipts", body: unknown) {
  const config = env();
  if (!config.EXPO_ACCESS_TOKEN) throw new Error("PushConfigurationError");
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.EXPO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("PushTransportError");
  const result = z
    .object({
      data: z.union([z.array(ticket), z.record(z.string(), ticket)]).optional(),
      errors: z.array(z.unknown()).optional(),
    })
    .parse(await response.json());
  if (!result.data || result.errors?.length)
    throw new Error("PushResponseError");
  return result.data;
}
