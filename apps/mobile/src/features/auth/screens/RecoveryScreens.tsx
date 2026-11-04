import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../services/api";
import { useValidatedForm } from "../../../lib/forms";
import { Screen } from "../../../components/layout/screen";
import { FormField } from "../../../components/ui/input/FormField";
import { Button } from "../../../components/ui/button";
import { Notice } from "../../../components/feedback/Feedback";
import { resetSchema } from "../schemas";
export function ForgotPasswordScreen() {
  const form = useValidatedForm(
    z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }),
    { email: "" },
  );
  const [message, setMessage] = useState("");
  return (
    <Screen
      title="A fresh start."
      subtitle="We’ll email you a secure password reset link."
    >
      <FormField
        control={form.control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoComplete="email"
      />
      {message && <Notice>{message}</Notice>}
      {form.formState.errors.root?.message && (
        <Notice danger>{form.formState.errors.root.message}</Notice>
      )}
      <Button
        title="Send reset link"
        busy={form.formState.isSubmitting}
        onPress={() =>
          void form.submit(async (v) => {
            const result = await api<{ message: string }>(
              "/auth/request-password-reset",
              mutation(v),
            );
            setMessage(result.message);
          })()
        }
      />
    </Screen>
  );
}
export function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const form = useValidatedForm(resetSchema, {
    newPassword: "",
    confirmPassword: "",
  });
  const [done, setDone] = useState(false);
  const valid =
    typeof token === "string" && /^[a-zA-Z0-9._-]{16,2048}$/.test(token);
  return (
    <Screen title="Choose your new password.">
      {!valid ? (
        <>
          <Notice danger>
            This reset link is invalid. Request a fresh link.
          </Notice>
          <Button
            title="Request a new link"
            onPress={() => router.replace("/(auth)/forgot-password")}
          />
        </>
      ) : done ? (
        <>
          <Notice>
            Your password has been updated. Sign in with your new password.
          </Notice>
          <Button
            title="Sign in"
            onPress={() => router.replace("/(auth)/sign-in")}
          />
        </>
      ) : (
        <>
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
            label="Confirm password"
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
                  "/auth/reset-password",
                  mutation({ token, newPassword: v.newPassword }),
                );
                form.reset();
                setDone(true);
                router.setParams({ token: "" });
              })()
            }
          />
        </>
      )}
    </Screen>
  );
}
export function VerifyScreen() {
  const { email, token, verified } = useLocalSearchParams<{
    email?: string;
    token?: string;
    verified?: string;
  }>();
  const [message, setMessage] = useState(
      verified === "1"
        ? "Your email has been verified. You can sign in."
        : "Open the verification link in your email, then return to sign in.",
    ),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (typeof token !== "string" || !/^[a-zA-Z0-9._-]{16,2048}$/.test(token))
      return;
    let active = true;
    void api(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        if (active) {
          setMessage("Your email has been verified. You can sign in.");
          router.setParams({ token: "" });
        }
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <Screen
      title="Check your inbox."
      subtitle={email || "Verify your Quick Pay email"}
    >
      <Notice>{message}</Notice>
      <Text className="text-base leading-6 text-muted">
        Check your spam folder too. Verification keeps your account and payments
        secure.
      </Text>
      {email && (
        <Button
          title="Resend verification email"
          secondary
          busy={busy}
          onPress={() => {
            setBusy(true);
            void api(
              "/auth/send-verification-email",
              mutation({ email, callbackURL: "/sign-in?verified=1" }),
            )
              .then(() =>
                setMessage(
                  "If verification is needed, a new email is on its way.",
                ),
              )
              .catch((e) => setMessage(e.message))
              .finally(() => setBusy(false));
          }}
        />
      )}
      <Button
        title="Continue to sign in"
        onPress={() => router.replace("/(auth)/sign-in")}
      />
    </Screen>
  );
}
