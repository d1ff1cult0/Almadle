
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
    const session = await getServerSession();

    if (session) {
        redirect("/admin/dashboard");
    }

    const userCount = await prisma.user.count();
    if (userCount === 0) {
        redirect("/admin/setup");
    }

    redirect("/admin/login");
}
