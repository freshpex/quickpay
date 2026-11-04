import { useState } from "react";
import { router } from "expo-router";
import { signInSchema } from "../../schemas";
import { useValidatedForm } from "../../../../lib/forms";
import { FormField } from "../../../../components/ui/input/FormField";
import { Button } from "../../../../components/ui/button";
import { Notice } from "../../../../components/feedback/Feedback";
import { authClient } from "../../../../services/session/auth-client";
import { useSession } from "../../../../providers/SessionProvider";
import { Input } from "../../../../components/ui/input";
import { consumeDestination } from "../../../../services/deep-links/deferred";
export function SignInForm() {
  const form = useValidatedForm(signInSchema, { email: "", password: "" });
  const { refresh } = useSession();
  const [mfa, setMfa] = useState(false),
    [backup, setBackup] = useState(false),
    [code, setCode] = useState("");
  const submit = form.submit(async (v) => {
    if (mfa) {
      const result = backup ? await authClient.twoFactor.verifyBackupCode({code}) : await authClient.twoFactor.verifyTotp({ code });
      if (result.error)
        throw new Error(
          result.error.message || "Check your authenticator code.",
        );
    } else {
      const result = await authClient.signIn.email(v);
      if (result.error)
        throw new Error(
          result.error.message || "Check your email and password.",
        );
      if (result.data && "twoFactorRedirect" in result.data) {
        setMfa(true);
        form.setValue("password", "");
        return;
      }
    }
    form.reset();
    await refresh();
    router.replace(consumeDestination());
  });
  // MFA is a separate submit because the password has already been cleared.
  const [mfaBusy, setMfaBusy] = useState(false);
  const confirmMfa = async () => {
    if (mfaBusy) return;
    setMfaBusy(true);
    form.clearErrors();
    try {
      const result = backup ? await authClient.twoFactor.verifyBackupCode({code}) : await authClient.twoFactor.verifyTotp({ code });
      if (result.error) throw new Error(result.error.message);
      setCode("");
      await refresh();
      router.replace(consumeDestination());
    } catch (e) {
      form.setError("root", {
        message: e instanceof Error ? e.message : "Check your code.",
      });
    } finally {
      setMfaBusy(false);
    }
  };
  return (
    <>
      {!mfa ? (
        <>
          <FormField
            control={form.control}
            name="email"
            label="Email"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="username"
          />
          <FormField
            control={form.control}
            name="password"
            label="Password"
            password
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
          />
        </>
      ) : (
        <>
          <Notice>
            {backup ? "Enter one of your unused backup codes." : "Enter the current six-digit code from your authenticator."}
          </Notice>
          <Input
            label={backup ? "Backup code" : "Authenticator code"}
            value={code}
            onChangeText={setCode}
            keyboardType={backup ? "default" : "number-pad"}
            autoComplete={backup ? "off" : "one-time-code"}
            maxLength={backup ? 32 : 6}
          />
          <Button title={backup ? "Use an authenticator code" : "Use a backup code"} secondary onPress={() => {setBackup(!backup); setCode("");}} />
        </>
      )}
      {form.formState.errors.root?.message && (
        <Notice danger>{form.formState.errors.root.message}</Notice>
      )}
      <Button
        title={mfa ? "Verify and sign in" : "Sign in"}
        busy={form.formState.isSubmitting || mfaBusy}
        onPress={() => void (mfa ? confirmMfa() : submit())}
      />
      <Button
        title="Forgot password?"
        secondary
        onPress={() => router.push("/(auth)/forgot-password")}
      />
      <Button
        title="Create an account"
        secondary
        onPress={() => router.push("/(auth)/sign-up")}
      />
    </>
  );
}
