"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Car,
  FileText,
  RefreshCw,
  BarChart3,
  UserCheck,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  // Navigation Links Definition
  const mainNavItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Insurance",
      href: "/dashboard/policies",
      icon: ShieldCheck,
    },
    {
      name: "Customers",
      href: "/dashboard/customers",
      icon: Users,
    },
    {
      name: "Reports",
      href: "/dashboard/reports",
      icon: BarChart3,
    },
  ];

  // Admin-only Navigation Links
  const adminNavItems = [
    {
      name: "Users",
      href: "/dashboard/users",
      icon: UserCheck,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside
      id="app_sidebar"
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-100 bg-white ${className}`}
    >
      {/* Sidebar Branding Header */}
      <div id="sidebar_branding" className="flex h-16 items-center gap-2 px-6 border-b border-neutral-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-neutral-800 leading-none">
            PolicyFlow
          </span>
          <span className="mt-1 text-[10px] text-neutral-400 font-medium tracking-wider uppercase">
            Insurance Hub
          </span>
        </div>
      </div>

      {/* Navigational Links List */}
      <nav id="sidebar_nav" className="flex-1 space-y-6 px-4 py-6 overflow-y-auto">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            Workspace
          </p>
          <ul className="space-y-1 mt-2">
            {mainNavItems.map((item) => {
              const active = isLinkActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    id={`nav_link_${item.name.toLowerCase().replace(/\s+/g, "_")}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-600" : "text-neutral-400"}`} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Admin Navigation Section - Hidden for Employees */}
        {user?.role === "admin" && (
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Administration
            </p>
            <ul className="space-y-1 mt-2">
              {adminNavItems.map((item) => {
                const active = isLinkActive(item.href);
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      id={`nav_link_${item.name.toLowerCase().replace(/\s+/g, "_")}`}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-blue-600" : "text-neutral-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Sidebar Footer Badge */}
      <div id="sidebar_footer_status" className="p-4 border-t border-neutral-100 bg-neutral-50/50">
        <div className="rounded-xl bg-white border border-neutral-100 p-3 flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-neutral-700 leading-none">Database Status</span>
            <span className="text-[10px] text-neutral-400 mt-1">MongoDB Atlas Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
