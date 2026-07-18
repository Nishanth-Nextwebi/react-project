import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
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
      <div id="dashboard_workspace" className="min-h-screen bg-neutral-50/50">
        {/* Sidebar Navigation */}
        <Sidebar className="hidden md:flex" />

        {/* Main Workspace Frame */}
        <div id="workspace_content_frame" className="flex flex-col md:pl-64 min-h-screen">
          {/* Dynamic Header */}
          <Header />

          {/* Dynamic Inner Page Content */}
          <main id="main_page_area" className="flex-1 p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
