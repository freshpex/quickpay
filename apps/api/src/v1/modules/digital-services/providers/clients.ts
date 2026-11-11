import { env } from "../../../../shared/infrastructure/env";
import { DomainError } from "../../../../shared/errors";

type Payload = Record<string, string>;
async function request(
  url: string,
  key: string,
  options: {
    method: "GET" | "POST";
    data?: Payload;
    authorization: "bearer" | "form";
  },
) {
  if (!key)
    throw new DomainError(
      "PROVIDER_UNCONFIGURED",
      "This service is currently unavailable.",
      503,
    );
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers: {
        Accept: "application/json",
        ...(options.authorization === "bearer"
          ? { Authorization: `Bearer ${key}` }
          : {}),
        ...(options.data
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}),
      },
      ...(options.data ? { body: new URLSearchParams(options.data) } : {}),
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
  } catch {
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "The provider could not complete this request. Please check the order status before retrying.",
      503,
    );
  }
  if (!response.ok)
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "The provider could not complete this request. Please check the order status before retrying.",
      503,
    );
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "The provider returned an unreadable response. Please check the order status before retrying.",
      503,
    );
  }
  if (
    typeof result !== "object" ||
    result === null ||
    ("error" in result && !!result.error) ||
    ("success" in result &&
      [false, 0, "0", "false"].includes(result.success as never))
  )
    throw new DomainError(
      "PROVIDER_REJECTED",
      "The provider could not complete this request.",
      409,
    );
  return result;
}
export const smsPool = {
  call(path: string, data: Payload = {}) {
    const key = env().SMSPOOL_API_KEY;
    return request(`https://api.smspool.net/${path}`, key, {
      method: "POST",
      authorization: "form",
      data: { ...data, key },
    });
  },
  countries: () => smsPool.call("country/retrieve_all"),
  services: () => smsPool.call("service/retrieve_all"),
  price: (country: string, service: string) =>
    smsPool.call("request/price", { country, service }),
  purchase: (country: string, service: string, maxPrice: string) =>
    smsPool.call("purchase/sms", { country, service, max_price: maxPrice }),
  status: (orderid: string) => smsPool.call("sms/check", { orderid }),
  cancel: (orderid: string) => smsPool.call("sms/cancel", { orderid }),
};
export const fiveSim = {
  call(path: string, method: "GET" | "POST" = "GET") {
    return request(`https://5sim.net/v1/${path}`, env().FIVESIM_API_KEY, {
      method,
      authorization: "bearer",
      ...(method === "POST" ? { data: {} } : {}),
    });
  },
  prices: () => fiveSim.call("guest/prices"),
  purchase: (country: string, operator: string, service: string) =>
    fiveSim.call(
      `user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(service)}`,
      "POST",
    ),
  status: (id: string) => fiveSim.call(`user/check/${encodeURIComponent(id)}`),
  cancel: (id: string) =>
    fiveSim.call(`user/cancel/${encodeURIComponent(id)}`, "POST"),
  finish: (id: string) =>
    fiveSim.call(`user/finish/${encodeURIComponent(id)}`, "POST"),
};
export type BoostProvider = "boostero" | "smmkings";
export function boosting(provider: BoostProvider) {
  const call = (action: string, data: Payload = {}) => {
    const key =
      provider === "boostero" ? env().BOOSTERO_API_KEY : env().SMMKINGS_API_KEY;
    return request(
      provider === "boostero"
        ? "https://boostero.com/api/v2"
        : "https://smmkings.com/api/v2",
      key,
      {
        method: "POST",
        authorization: "form",
        data: { ...data, key, action },
      },
    );
  };
  return {
    services: () => call("services"),
    purchase: (service: string, link: string, quantity: string) =>
      call("add", { service, link, quantity }),
    status: (order: string) => call("status", { order }),
    cancel: (orders: string) => call("cancel", { orders }),
    refill: (order: string) => call("refill", { order }),
    balance: () => call("balance"),
  };
}
