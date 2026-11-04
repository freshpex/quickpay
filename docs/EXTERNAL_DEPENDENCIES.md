# External dependencies and launch gates

These remain unresolved external setup or provider-dependent implementation. Application code and local tests do not establish them as complete.

| Dependency | Required next evidence |
|---|---|
| Paystack account | Approved collection/transfer capabilities, keys, webhook delivery, funded payout balance and real sandbox success/failure/reversal records |
| VTpass account | Sandbox/live keys, approved service inventory, correct per-biller payloads, plan refresh, beneficiary checks, fulfillment and reconciliation proof |
| Gift-card supplier | Select purchase supplier, commercial terms, OAuth credentials, funded balance, inventory/price snapshots, completion of the supplier-specific quote/order/private-fulfillment adapter and end-to-end validation |
| Gift-card resale | Supported brands/regions/types, real rate policy, trained reviewers, liquidity, evidence safety scanner and dispute procedures |
| SMS | Termii adapter is implemented; configure the account-specific HTTPS base URL, API key, approved sender and funding, then verify actual delivery/OTP. Number-change recovery still needs an operating process; unconfigured phones remain unverified |
| Email | Mailjet Send API adapter is implemented; configure API/secret keys and a verified sender, then verify real signup/reset delivery, domain authentication and bounce handling. No credentials or live delivery proof are included |
| Identity/KYC | Operating requirements, customer tiers, allowed checks/consent, provider access, implementation of the approved identity adapter, screening and review process; no identity verification is claimed |
| Legal/business | Operating entity, financial-service permissions, provider contracts, reviewed terms/privacy, age/residency eligibility, refunds and complaint timelines |
| Financial operations | Provider statement matching, disputes/refunds beyond direct charge/transfer webhook shapes, chargeback debt recovery and unresolved-transfer escalation |
| Production infrastructure | HTTPS, secrets manager, restricted database roles, private persistent shared evidence storage, malware scan integration, backups and restore drill |
| Security/operations | CSP tuning, penetration testing, independent financial review, retention/deletion jobs, audit/queue monitoring, alert routing, disaster recovery and incident ownership |
| Production release | Staging deployment, sandbox end-to-end acceptance, load/chaos checks, reviewed migration rollout, real device checks and production smoke proof |

No generic FX pair is enabled. Broader currency exchange requires explicit supported pairs, provider-confirmed quotes and settlement rules. No cryptocurrency trading is included.
