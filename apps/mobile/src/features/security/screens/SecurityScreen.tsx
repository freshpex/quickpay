import { PinSettings } from "../components/PinSettings";
import { useState } from "react";
import type { ProfileUser } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useResource } from "../../../services/api/use-resource";
import { useValidatedForm } from "../../../lib/forms";
import { changePasswordSchema } from "../../auth/schemas";
import { Screen } from "../../../components/layout/screen";
import { FormField } from "../../../components/ui/input/FormField";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card/Card";
import { Notice } from "../../../components/feedback/Feedback";
import { PhoneVerification } from "../components/PhoneVerification";
import { AuthenticatorSettings } from "../components/AuthenticatorSettings";
export function SecurityScreen() {
  const profile = useResource<{ user: ProfileUser }>("/profile"),
    caps = useResource<{ phone: boolean; identity: boolean }>(
      "/verification/capabilities",
    );
  const form = useValidatedForm(changePasswordSchema, {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  return (
    <Screen title="Keep your corner secure.">
      <PinSettings />
      <Card>
        <FormField
          control={form.control}
          name="currentPassword"
          label="Current password"
          password
          autoComplete="current-password"
          textContentType="password"
        />
        <FormField
          control={form.control}
          name="newPassword"
          label="New password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {form.formState.errors.root?.message && (
          <Notice danger>{form.formState.errors.root.message}</Notice>
        )}
        <Button
          title="Update password"
          busy={form.formState.isSubmitting}
          onPress={() =>
            void form.submit(async (v) => {
              await api(
                "/auth/change-password",
                mutation({
                  currentPassword: v.currentPassword,
                  newPassword: v.newPassword,
                  revokeOtherSessions: true,
                }),
              );
              form.reset();
              setMessage("Password updated. Other sessions have been revoked.");
            })()
          }
        />
      </Card>
      {profile.data && (
        <Card>
          <AuthenticatorSettings
            enabled={profile.data.user.two_factor_enabled}
            onChanged={() => void profile.refetch()}
          />
        </Card>
      )}
      {profile.data?.user.phone_verified ? (
        <Notice>Your phone number is verified.</Notice>
      ) : caps.data?.phone ? (
        <Card>
          <PhoneVerification onVerified={() => void profile.refetch()} />
        </Card>
      ) : (
        <Notice>Phone verification is currently unavailable.</Notice>
      )}
      {message && <Notice>{message}</Notice>}
    </Screen>
  );
}
