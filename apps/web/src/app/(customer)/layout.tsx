import { CustomerShell } from "../../components/layout/customer-shell/CustomerShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
