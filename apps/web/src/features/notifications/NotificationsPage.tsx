"use client";
import { api } from "@quickpay/api-client";
import { toast } from "sonner";
import { useApi } from "../../lib/use-api";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../components/feedback";
export function NotificationsPage() {
  const r = useApi<{
    notifications: {
      id: string;
      title: string;
      body: string;
      read: boolean;
      created_at: string;
    }[];
  }>("/notifications");
  async function read(id: string) {
    try {
      await api("/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id }),
      });
      await r.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    }
  }
  return (
    <section>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Your updates</h1>
      {r.loading ? (
        <LoadingState />
      ) : r.error ? (
        <ErrorState message={r.error} />
      ) : !r.data?.notifications.length ? (
        <EmptyState
          title="You’re all caught up."
          description="Payment updates, rewards and replies will appear here."
        />
      ) : (
        <div className="max-w-3xl space-y-4">
          {r.data.notifications.map((n) => (
            <article
              key={n.id}
              className={`rounded-2xl border bg-white p-5 ${n.read ? "border-ink/10" : "border-brand/30"}`}
            >
              <h2 className="font-bold">{n.title}</h2>
              <p className="mt-2 text-sm text-ink/60">{n.body}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <time className="text-xs text-ink/40">
                  {new Date(n.created_at).toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}
                </time>
                {!n.read && (
                  <button
                    onClick={() => read(n.id)}
                    className="min-h-11 text-xs font-bold text-brand"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
