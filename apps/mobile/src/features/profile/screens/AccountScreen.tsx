import { useState } from "react";
import { Linking } from "react-native";
import { router } from "expo-router";
import { useSession } from "../../../providers/SessionProvider";
import { siteUrl } from "../../../lib/config";
import { Screen } from "../../../components/layout/screen";
import { LinkRow } from "../../../components/ui/card/Card";
import { Button } from "../../../components/ui/button";
import { Notice } from "../../../components/feedback/Feedback";
export function AccountScreen() {
  const { session, logout } = useSession();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Screen title="Your corner." subtitle={session?.user.email}>
      <LinkRow
        title="Profile"
        body="Your name and verified contacts"
        onPress={() => router.push("/(customer)/profile")}
      />
      <LinkRow
        title="Wallet"
        onPress={() => router.push("/(customer)/wallet")}
      />
      <LinkRow
        title="Security"
        body="Password, verification and authenticator"
        onPress={() => router.push("/(customer)/security")}
      />
      <LinkRow
        title="Notifications"
        body="Your updates and push preferences"
        onPress={() => router.push("/(customer)/notifications")}
      />
      <LinkRow
        title="Referrals & rewards"
        onPress={() => router.push("/(customer)/referrals")}
      />
      <LinkRow
        title="Saved recipients"
        onPress={() => router.push("/(customer)/beneficiaries")}
      />
      <LinkRow
        title="Support"
        onPress={() => router.push("/(customer)/support")}
      />
      {siteUrl && (
        <>
          <LinkRow
            title="Terms of Service"
            onPress={() => void Linking.openURL(`${siteUrl}/terms`)}
          />
          <LinkRow
            title="Privacy Policy"
            onPress={() => void Linking.openURL(`${siteUrl}/privacy`)}
          />
        </>
      )}
      {error && <Notice danger>{error}</Notice>}
      <Button
        title="Sign out"
        secondary
        busy={busy}
        onPress={() => {
          if (busy) return;
          setBusy(true);
          void logout()
            .then(() => router.replace("/(auth)/sign-in"))
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      />
    </Screen>
  );
}
