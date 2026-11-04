import { Screen } from "../../../components/layout/screen";
import { SignInForm } from "../components/sign-in-form";
import { SignUpForm } from "../components/sign-up-form";
export function SignInScreen() {
  return (
    <Screen
      title="Good to have you back."
      subtitle="Your wallet. Your everyday, sorted."
    >
      <SignInForm />
    </Screen>
  );
}
export function SignUpScreen() {
  return (
    <Screen
      title="Make room for easy."
      subtitle="One account for payments, cards and rewards."
    >
      <SignUpForm />
    </Screen>
  );
}
