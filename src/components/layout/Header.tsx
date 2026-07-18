"use client";

import React from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, User, Shield, Briefcase, Bell } from "lucide-react";

interface HeaderProps {
  title?: string;
}

export default function Header({ title = "Dashboard" }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header id="app_header" className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-neutral-100 bg-white px-6 shadow-xs">
      
      {/* Current Page Title */}
      <div id="header_title_section" className="flex items-center gap-3">
        <h1 id="header_page_title" className="text-lg font-bold text-neutral-800 tracking-tight">
          {title}
        </h1>
      </div>

      {/* User Information and Actions */}
      <div id="header_actions_section" className="flex items-center gap-4">
        
        {/* Simple Notification Dot Icon */}
        <button id="notification_bell_btn" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
        </button>

        {/* Separator line */}
        <div className="h-6 w-px bg-neutral-100"></div>

        {/* User Card */}
        {user && (
          <div id="user_profile_card" className="flex items-center gap-3">
            <div className="flex flex-col text-right">
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

            {/* Sign Out Action Button */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              id="header_signout_btn"
              title="Sign Out"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-150"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
