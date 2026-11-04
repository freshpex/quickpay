import { AuthLayout, PasswordRecovery } from "../../../features/auth";
export default function Page() {
  return (
    <AuthLayout
      title="Forgot your password?"
      description="We’ll send you a link to choose a new one."
    >
      <PasswordRecovery />
    </AuthLayout>
  );
}
