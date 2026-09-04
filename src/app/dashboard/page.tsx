import { getDashboardContext } from "@/lib/dashboard-context";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { OrganizationDashboard } from "@/components/dashboard/organization-dashboard";

export const dynamic = "force-dynamic";

/** Zeigt je nach Rolle das passende Dashboard. */
export default async function DashboardPage() {
  const context = await getDashboardContext();

  if (context.staff) {
    return <AdminDashboard context={context} />;
  }

  return <OrganizationDashboard context={context} />;
}
