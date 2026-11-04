import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../providers/SessionProvider";
import { Share, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatMoney, type Referrals } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { siteUrl } from "../../../lib/config";
import { Screen } from "../../../components/layout/screen";
import { Button } from "../../../components/ui/button";
import { Card, Row } from "../../../components/ui/card/Card";
import { PasswordInput } from "../../../components/ui/password-input";
import { Sheet } from "../../../components/ui/bottom-sheet/Sheet";
import {
  Notice,
  LoadingState,
  ErrorState,
  EmptyState,
} from "../../../components/feedback/Feedback";
import { localDate } from "../../transactions/lib/status";
export function ReferralsScreen() {
  const cache = useQueryClient(); const {session} = useSession();
  const referrals = useResource<Referrals>("/referrals"),
    rule = useResource<{ summary: string }>("/rewards/active-rule");
  const [claim, setClaim] = useState<string | null>(null),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <Screen
      title="Good things go around."
      subtitle="Invite your people. Follow every reward."
      onRefresh={() => {
        void referrals.refetch();
        void rule.refetch();
      }}
      refreshing={referrals.isRefetching}
    >
      {referrals.isPending ? (
        <LoadingState />
      ) : referrals.error ? (
        <ErrorState
          error={referrals.error}
          retry={() => void referrals.refetch()}
        />
      ) : (
        <>
          <View className="gap-4 rounded-[32px] bg-deep p-6">
            <Text className="text-base text-white/80">Your referral code</Text>
            <Text
              selectable
              className="text-3xl font-extrabold tracking-widest text-lime"
            >
              {referrals.data.code}
            </Text>
            <Text className="text-base text-white">
              {referrals.data.invited} people invited
            </Text>
          </View>
          <Button
            title="Share your invitation"
            onPress={() => {
              void Share.share({
                message: `Join me on Quick Pay. Use my referral code ${referrals.data.code}.${siteUrl ? ` ${siteUrl}/sign-up?ref=${encodeURIComponent(referrals.data.code)}` : ""}`,
              }).catch((e) => setMessage(e.message));
            }}
          />
          {rule.data && <Notice>{rule.data.summary}</Notice>}
          {!referrals.data.rewards.length ? (
            <EmptyState
              title="Your next good thing"
              body="Eligible rewards appear here after qualifying activity. Each reward follows its recorded campaign rules."
            />
          ) : (
            referrals.data.rewards.map((r, index) => (
              <Animated.View
                key={r.id}
                entering={FadeInDown.delay(Math.min(index, 4) * 40).duration(
                  200,
                )}
              >
                <Card>
                  <Row
                    label={`Campaign version ${r.version}`}
                    value={formatMoney(r.amount)}
                  />
                  <Row label="Status" value={r.status} />
                  {r.status === "pending" && (
                    <Row
                      label="Eligible after"
                      value={localDate(r.available_at)}
                    />
                  )}
                  <Text className="text-sm leading-6 text-muted">
                    {r.summary}
                  </Text>
                  {r.status === "available" &&
                    r.claimable &&
                    r.withdrawable && (
                      <Button
                        title="Move reward to wallet"
                        secondary
                        onPress={() => setClaim(r.id)}
                      />
                    )}
                </Card>
              </Animated.View>
            ))
          )}
        </>
      )}
      {message && <Notice>{message}</Notice>}
      <Sheet
        open={!!claim}
        onClose={() => {
          if (!busy) {
            setClaim(null);
            setPassword("");
          }
        }}
      >
        <Text className="text-2xl font-bold text-ink">Claim your reward.</Text>
        <PasswordInput
          label="Account password"
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
        />
        <Button
          title="Confirm reward claim"
          busy={busy}
          disabled={!password}
          onPress={() => {
            if (!claim || busy) return;
            setBusy(true);
            void api<{ message: string }>(
              `/rewards/${claim}/claim`,
              mutation({ password }),
            )
              .then(async (r) => {
                setMessage(r.message);
                  await cache.invalidateQueries({queryKey: [session?.user.id, "/wallet"]});
                setClaim(null);
                await referrals.refetch();
              })
              .catch((e) => setMessage(e.message))
              .finally(() => {
                setPassword("");
                setBusy(false);
              });
          }}
        />
      </Sheet>
    </Screen>
  );
}
