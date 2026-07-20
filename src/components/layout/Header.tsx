"use client";

import React from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Shield, Briefcase, Bell, Menu } from "lucide-react";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function Header({ title = "Dashboard", onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header id="app_header" className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-100 bg-white px-4 sm:px-6 shadow-xs">

      {/* Current Page Title */}
      <div id="header_title_section" className="flex items-center gap-3 min-w-0">
        {/* Hamburger menu - mobile only, opens the Sidebar drawer */}
        <button
          id="mobile_menu_toggle_btn"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors md:hidden cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 id="header_page_title" className="text-base sm:text-lg font-bold text-neutral-800 tracking-tight truncate">
          {title}
        </h1>
      </div>

      {/* User Information and Actions */}
      <div id="header_actions_section" className="flex items-center gap-2 sm:gap-4 shrink-0">

        {/* Simple Notification Dot Icon */}
        <button id="notification_bell_btn" className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
        </button>

        {/* Separator line */}
        <div className="hidden sm:block h-6 w-px bg-neutral-100"></div>

        {/* User Card */}
        {user && (
          <div id="user_profile_card" className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span id="user_display_name" className="text-sm font-semibold text-neutral-800">
                {user.name || "User"}
              </span>
              <span id="user_display_role" className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                {user.role === "admin" ? (
                  <>
                    <Shield className="h-3 w-3 text-blue-600" />
                    Admin
                  </>
                ) : (
                  <>
                    <Briefcase className="h-3 w-3 text-neutral-500" />
                    Employee
                  </>
                )}
              </span>
            </div>

            {/* Profile Avatar / Placeholder */}
            <div id="user_avatar_bubble" className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 font-semibold text-sm border border-neutral-200">
              {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </div>

            {/* Sign Out Action Button - desktop only, mobile users sign out from the menu drawer */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              id="header_signout_btn"
              title="Sign Out"
              className="ml-1 hidden md:flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-150"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
