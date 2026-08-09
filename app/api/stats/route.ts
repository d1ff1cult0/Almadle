import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAdminDashboardData } from "@/lib/adminStats";

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getAdminDashboardData());
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
