import type { Role } from "@prisma/client";

import { isAdmin, isStaff } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

/**
 * Navigationsstruktur je Rolle.
 * Ausgeblendete Einträge sind zusätzlich serverseitig geschützt –
 * die Navigation ist reine Benutzerführung, keine Sicherheitsgrenze.
 */
export function dashboardNavigation(role: Role): NavGroup[] {
  if (isStaff(role)) {
    return [
      {
        items: [{ href: "/dashboard", label: "Dashboard", icon: "gauge", exact: true }],
      },
      {
        title: "Inhalte",
        items: [
          // Startseite und Datenimport sind der Administration vorbehalten.
          // Die Prüfung erfolgt zusätzlich serverseitig in jeder Seite und in
          // jedem Endpunkt; diese Filterung dient allein der Benutzerführung.
          ...(isAdmin(role)
            ? [{ href: "/dashboard/homepage", label: "Homepage", icon: "layout" }]
            : []),
          { href: "/dashboard/organisationen", label: "Organisationen", icon: "building" },
          { href: "/dashboard/agenda", label: "Agenda", icon: "calendar" },
          { href: "/dashboard/medien", label: "Medien", icon: "image" },
          ...(isAdmin(role)
            ? [
                { href: "/dashboard/import", label: "Datenimport", icon: "upload" },
                { href: "/dashboard/datenqualitaet", label: "Datenqualität", icon: "chart" },
              ]
            : []),
        ],
      },
      {
        title: "Verwaltung",
        items: [
          { href: "/dashboard/accounts", label: "Accounts", icon: "users" },
          { href: "/dashboard/abonnemente", label: "Abonnemente", icon: "badge" },
          // Zahlungen sind eine kaufmännische Funktion und nur für ADMIN.
          ...(isAdmin(role)
            ? [{ href: "/dashboard/zahlungen", label: "Zahlungen", icon: "wallet" }]
            : []),
          { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
          { href: "/dashboard/werbung", label: "Werbung", icon: "megaphone" },
        ],
      },
      {
        title: "Auswertung",
        items: [
          { href: "/dashboard/statistik", label: "Statistik", icon: "chart" },
          { href: "/dashboard/logs", label: "Logs", icon: "scroll" },
          ...(isAdmin(role)
            ? [{ href: "/dashboard/einstellungen", label: "Einstellungen", icon: "settings" }]
            : []),
        ],
      },
    ];
  }

  // Organisationsaccounts (FASNACHT, GUGGE)
  return [
    {
      items: [{ href: "/dashboard", label: "Dashboard", icon: "gauge", exact: true }],
    },
    {
      title: "Meine Organisation",
      items: [
        { href: "/dashboard/seite", label: "Meine Seite", icon: "layout" },
        { href: "/dashboard/veranstaltungen", label: "Veranstaltungen", icon: "calendar" },
        { href: "/dashboard/galerie", label: "Galerie", icon: "image" },
        { href: "/dashboard/qr-code", label: "QR-Code", icon: "layout" },
        { href: "/dashboard/statistik", label: "Statistik", icon: "chart" },
      ],
    },
    {
      title: "Konto",
      items: [
        { href: "/dashboard/abonnement", label: "Abonnement", icon: "badge" },
        { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
        { href: "/dashboard/einstellungen", label: "Einstellungen", icon: "settings" },
      ],
    },
  ];
}
