import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { getAdminDashboardData } from "@/lib/adminStats";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/admin/login");
  }

  const data = await getAdminDashboardData();

  return <DashboardClient data={data} />;
}
