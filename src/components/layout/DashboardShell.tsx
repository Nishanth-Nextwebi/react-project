"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div id="dashboard_workspace" className="min-h-screen bg-neutral-50/50">
      {/* Sidebar Navigation - fixed on desktop, slide-in drawer on mobile */}
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      {/* Main Workspace Frame */}
      <div id="workspace_content_frame" className="flex flex-col md:pl-64 min-h-screen">
        {/* Dynamic Header */}
        <Header onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Dynamic Inner Page Content */}
        <main id="main_page_area" className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
