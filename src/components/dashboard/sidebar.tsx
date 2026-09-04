"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, ExternalLink, LogOut, Menu, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NavIcon } from "@/components/dashboard/nav-icon";
import type { NavGroup } from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";

export type SidebarUser = {
  name: string;
  email: string;
  roleLabel: string;
};

export type SidebarOrganization = {
  name: string;
  href: string;
  statusLabel: string;
  published: boolean;
} | null;

export function DashboardShell({
  navigation,
  user,
  organization,
  unreadNotifications,
  openTickets,
  children,
}: {
  navigation: NavGroup[];
  user: SidebarUser;
  organization: SidebarOrganization;
  unreadNotifications: number;
  openTickets: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Dashboard-Navigation">
      {navigation.map((group, index) => (
        <div key={group.title ?? index}>
          {group.title ? (
            <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {group.title}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = item.href.endsWith("/tickets") && openTickets > 0 ? openTickets : null;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-800 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge ? (
                      <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
        <Logo variant="light" href="/dashboard" />
      </div>

      {organization ? (
        <div className="mx-3 mt-4 rounded-lg bg-white/5 p-3">
          <p className="truncate text-sm font-semibold text-white">{organization.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant={organization.published ? "success" : "warning"}>
              {organization.statusLabel}
            </Badge>
          </div>
          <Link
            href={organization.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
          >
            Vorschau öffnen
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      ) : null}

      {nav}

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href="/dashboard/benachrichtigungen"
          className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">Benachrichtigungen</span>
          {unreadNotifications > 0 ? (
            <span className="rounded-full bg-accent-500 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
              {unreadNotifications}
            </span>
          ) : null}
        </Link>

        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white"
            aria-hidden
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-400">{user.roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Abmelden"
            title="Abmelden"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-muted/40">
      {/* Feste Seitenleiste ab Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-primary-950 lg:flex">
        {sidebarContent}
      </aside>

      {/* Ausklappbare Navigation auf Mobilgeräten */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-primary-950/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-primary-950">
            {sidebarContent}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Menü öffnen"
            aria-expanded={open}
          >
            <Menu />
          </Button>
          <Logo showWordmark={false} href="/dashboard" />
          <span className="font-display text-sm font-semibold">Dashboard</span>
          {unreadNotifications > 0 ? (
            <Link
              href="/dashboard/benachrichtigungen"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground"
              aria-label={`${unreadNotifications} ungelesene Benachrichtigungen`}
            >
              <span className="relative">
                <Bell className="h-5 w-5" aria-hidden />
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-500" />
              </span>
            </Link>
          ) : null}
        </header>

        <main id="inhalt" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {open ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed right-4 top-4 z-[60] rounded-lg bg-white p-2 shadow-lift lg:hidden"
          aria-label="Menü schliessen"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
