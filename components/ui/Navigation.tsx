"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/cn";

interface NavigationProps {
  userName?: string;
  onSignOut?: () => void;
}

export function Navigation({ userName, onSignOut }: NavigationProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Sites", icon: "🏠" },
    // Future navigation items
    // { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🧠</span>
              <span className="text-xl font-bold text-brand-600">CogniCMS</span>
            </Link>

            {/* Navigation Items */}
            <div className="hidden md:flex md:gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {userName && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {userName.charAt(0).toUpperCase()}
                </div>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
