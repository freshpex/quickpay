import { Controller } from "react-hook-form";
import { Linking, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { signUpSchema } from "@quickpay/contracts";
import { mutation } from "@quickpay/api-client";
import { api } from "../../../../services/api";
import { useValidatedForm } from "../../../../lib/forms";
import { FormField } from "../../../../components/ui/input/FormField";
import { Button } from "../../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Notice } from "../../../../components/feedback/Feedback";
import { siteUrl } from "../../../../lib/config";
import { useConnection } from "../../../../services/api/use-connection";
export function SignUpForm() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { phase } = useConnection();
  const form = useValidatedForm(signUpSchema, {
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    referralCode:
      typeof ref === "string" && /^[a-zA-Z0-9_-]{1,32}$/.test(ref) ? ref : "",
    terms: false,
  });
  const submit = form.submit(async (v) => {
    await api("/auth/sign-up/email", mutation(v));
    form.reset();
    router.replace({ pathname: "/(auth)/verify", params: { email: v.email } });
  });
  return (
    <>
      <FormField
        control={form.control}
        name="name"
        label="Full name"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <FormField
        control={form.control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <FormField
        control={form.control}
        name="phoneNumber"
        label="Phone number"
        keyboardType="phone-pad"
        placeholder="0801 234 5678"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <FormField
        control={form.control}
        name="password"
        label="Password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Notice>
        Use at least 12 characters, including uppercase, lowercase and a number.
      </Notice>
      <FormField
        control={form.control}
        name="confirmPassword"
        label="Confirm password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <FormField
        control={form.control}
        name="referralCode"
        label="Referral code (optional)"
        autoComplete="off"
      />
      <Controller
        control={form.control}
        name="terms"
        render={({ field }) => (
          <Checkbox
            checked={field.value}
            onChange={field.onChange}
            label="I accept the Terms of Service and Privacy Policy."
            error={form.formState.errors.terms?.message}
          />
        )}
      />
      <View className="gap-2">
        <Button
          title="Read Terms of Service"
          secondary
          disabled={!siteUrl}
          onPress={() => {
            if (siteUrl) void Linking.openURL(`${siteUrl}/terms`);
          }}
        />
        <Button
          title="Read Privacy Policy"
          secondary
          disabled={!siteUrl}
          onPress={() => {
            if (siteUrl) void Linking.openURL(`${siteUrl}/privacy`);
          }}
        />
      </View>
      {!siteUrl && (
        <Notice danger>
          Policy links are unavailable. Please try again later.
        </Notice>
      )}
      {form.formState.errors.root?.message && (
        <Notice danger>{form.formState.errors.root.message}</Notice>
      )}
      <Button
        title={
          form.formState.isSubmitting &&
          (phase === "connecting" || phase === "slow")
            ? "Securing connection…"
            : "Create account"
        }
        busy={form.formState.isSubmitting}
        disabled={!siteUrl}
        onPress={() => void submit()}
      />
      <Button
        title="Already registered? Sign in"
        secondary
        onPress={() => router.replace("/(auth)/sign-in")}
      />
    </>
  );
}
