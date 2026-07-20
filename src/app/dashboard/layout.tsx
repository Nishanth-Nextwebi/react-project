import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <SessionProvider>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}
