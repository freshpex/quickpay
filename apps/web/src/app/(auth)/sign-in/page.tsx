import { AuthLayout, SignInForm } from "../../../features/auth";
export default function Page() {
  return (
    <AuthLayout
      title="Welcome back."
      description="Let’s get your everyday sorted."
    >
      <SignInForm />
    </AuthLayout>
  );
}
