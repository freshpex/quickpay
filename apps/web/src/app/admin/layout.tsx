import { AdminShell } from "../../features/admin/components/AdminShell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
