import { env } from "../../../../shared/infrastructure/env";
import { DomainError } from "../../../../shared/errors";

type Payload = Record<string, string>;
async function request(url: string, key: string, data?: Payload) {
  if (!key)
    throw new DomainError(
      "PROVIDER_UNCONFIGURED",
      "This service is currently unavailable.",
      503,
    );
  const response = await fetch(url, {
    method: data ? "POST" : "GET",
    headers: data
      ? {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${key}`,
        }
      : { Authorization: `Bearer ${key}`, Accept: "application/json" },
    ...(data ? { body: new URLSearchParams(data) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw new DomainError(
      "PROVIDER_UNAVAILABLE",
      "The provider could not complete this request. Please check the order status before retrying.",
      503,
    );
  const result = await response.json();
  if (result.error || result.success === false || result.success === 0)
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
    return request(`https://api.smspool.net/${path}`, key, { ...data, key });
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
  call(path: string) {
    return request(`https://5sim.net/v1/${path}`, env().FIVESIM_API_KEY);
  },
  prices: () => fiveSim.call("guest/prices"),
  purchase: (country: string, operator: string, service: string) =>
    fiveSim.call(
      `user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(service)}`,
    ),
  status: (id: string) => fiveSim.call(`user/check/${encodeURIComponent(id)}`),
  cancel: (id: string) => fiveSim.call(`user/cancel/${encodeURIComponent(id)}`),
  finish: (id: string) => fiveSim.call(`user/finish/${encodeURIComponent(id)}`),
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
      { ...data, key, action },
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
