import { AuthLayout, SignUpForm } from "../../../features/auth";
export default function Page() {
  return (
    <AuthLayout
      title="Create your account."
      description="A few details and you’re on your way."
    >
      <SignUpForm />
    </AuthLayout>
  );
}
