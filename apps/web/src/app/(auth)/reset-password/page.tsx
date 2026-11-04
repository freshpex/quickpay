import { AuthLayout, PasswordRecovery } from "../../../features/auth";
export default function Page() {
  return (
    <AuthLayout
      title="A fresh start."
      description="Choose a strong new password for your account."
    >
      <PasswordRecovery reset />
    </AuthLayout>
  );
}
