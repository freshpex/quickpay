"use client";
import { TransactionPinField } from "../security/TransactionPinField";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Users } from "lucide-react";
import { formatMoney } from "@quickpay/contracts";
import { api, mutation } from "@quickpay/api-client";
import { useApi } from "../../lib/use-api";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/feedback";
type Rewards = {
  code: string;
  invited: string;
  rewards: {
    id: string;
    amount: string;
    status: string;
    summary: string;
    version: number;
    claimable: boolean;
    withdrawable: boolean;
    available_at: string;
  }[];
};
export function ReferralsPage() {
  const info = useApi<Rewards>("/referrals"),
    rule = useApi<{ summary: string }>("/rewards/active-rule");
  const [claim, setClaim] = useState(""),
    [pinReady, setPinReady] = useState(false),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        `/rewards/${claim}/claim`,
        mutation({ pin: new FormData(e.currentTarget).get("pin") }),
      );
      toast.success("Your reward is in your wallet.");
      setClaim("");
      await info.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Invite friends. Earn rewards.
        </h1>
        <p className="mt-3 text-sm text-ink/55">
          Share your code. Rewards follow verified qualifying payments.
        </p>
      </div>
      {info.loading ? (
        <LoadingState />
      ) : info.error ? (
        <ErrorState message={info.error} />
      ) : (
        info.data && (
          <>
            <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
              <div className="rounded-3xl bg-deep p-7 text-white">
                <Users className="text-lime" size={30} />
                <p className="mt-6 text-xs text-white/60">Your referral code</p>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <p className="break-all font-mono text-2xl font-bold">
                    {info.data.code}
                  </p>
                  <button
                    aria-label="Copy referral code"
                    className="flex size-11 items-center justify-center rounded-xl bg-white/10"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(info.data!.code)
                        .then(() => toast.success("Referral code copied."))
                        .catch(() =>
                          toast.error("Select and copy the code above."),
                        )
                    }
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <p className="mt-6 text-xs text-white/55">
                  {info.data.invited} people invited
                </p>
              </div>
              <div className="rounded-3xl border border-ink/10 bg-white p-7">
                <h2 className="font-bold">Current reward campaign</h2>
                <p className="mt-4 text-sm leading-relaxed text-ink/60">
                  {rule.data?.summary || "Checking the current campaign…"}
                </p>
              </div>
            </div>
            <section>
              <h2 className="mb-5 text-lg font-bold">Your rewards</h2>
              {!info.data.rewards.length ? (
                <EmptyState
                  title="Your reward story starts with an invitation."
                  description="A reward appears after your friend makes a verified payment that meets the active campaign rules."
                />
              ) : (
                <div className="space-y-4">
                  {info.data.rewards.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-ink/10 bg-white p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xl font-bold">
                          {formatMoney(r.amount)}
                        </p>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-ink/60">
                        Rule version {r.version}. {r.summary}
                      </p>
                      <p className="mt-2 text-xs text-ink/45">
                        Available after{" "}
                        {new Date(r.available_at).toLocaleString("en-NG", {
                          timeZone: "Africa/Lagos",
                        })}
                      </p>
                      {r.status === "available" &&
                        r.claimable &&
                        r.withdrawable && (
                          <Button
                            className="mt-4"
                            onClick={() => setClaim(r.id)}
                          >
                            Claim to wallet
                          </Button>
                        )}
                    </article>
                  ))}
                </div>
              )}
            </section>
            {claim && (
              <form
                onSubmit={submit}
                className="max-w-md space-y-4 rounded-2xl border border-brand/20 bg-white p-6"
              >
                <h2 className="font-bold">Confirm reward claim</h2>
                <TransactionPinField onReady={setPinReady} />
                <Button disabled={busy || !pinReady}>Confirm claim</Button>
                <button
                  type="button"
                  onClick={() => setClaim("")}
                  className="ml-4 min-h-11 text-sm font-bold"
                >
                  Cancel
                </button>
              </form>
            )}
          </>
        )
      )}
    </section>
  );
}
