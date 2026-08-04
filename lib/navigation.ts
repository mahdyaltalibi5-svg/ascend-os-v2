import {
  BadgeDollarSign,
  CalendarDays,
  Clock3,
  SearchCheck,
  PhoneCall,
  RadioTower,
  Settings,
  ShieldCheck,
  Target
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { PermissionKey } from "@/lib/permissions";
import { hasAnyPermission } from "@/lib/authorization";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: PermissionKey[];
  description: string;
};

export const appNavigation: NavItem[] = [
  {
    label: "Home",
    href: "/app",
    icon: RadioTower,
    permissions: ["dashboard.view"],
    description: "Operating home."
  },
  {
    label: "Sales",
    href: "/app/sales",
    icon: Target,
    permissions: ["leads.view", "prospects.view_own", "prospects.view_all", "pipeline.view_own"],
    description: "Lead engine, sales queue, appointments, and pipeline."
  },
  {
    label: "Call Desk",
    href: "/app/call-desk",
    icon: PhoneCall,
    permissions: ["calls.create", "calls.operate_assigned"],
    description: "One-lead-at-a-time calling workspace."
  },
  {
    label: "Callbacks",
    href: "/app/callbacks",
    icon: Clock3,
    permissions: ["callbacks.view_own", "callbacks.view_all"],
    description: "Exact callback queue and status tracking."
  },
  {
    label: "Calendar",
    href: "/app/calendar",
    icon: CalendarDays,
    permissions: [
      "appointments.view_own",
      "appointments.view_all",
      "callbacks.view_own",
      "callbacks.view_all"
    ],
    description: "Internal appointments, callbacks, and follow-ups."
  },
  {
    label: "My Dashboard",
    href: "/app/sales-dashboard",
    icon: Target,
    permissions: ["analytics.personal"],
    description: "Personal sales performance and next actions."
  },
  {
    label: "Founder",
    href: "/app/founder",
    icon: ShieldCheck,
    permissions: ["analytics.company"],
    description: "Company-wide calling, queue, and team controls."
  },
  {
    label: "Scraper",
    href: "/app/scraper",
    icon: SearchCheck,
    permissions: ["scraper.view"],
    description: "Verified Utah HVAC and plumbing discovery."
  },
  {
    label: "Revenue",
    href: "/app/revenue",
    icon: BadgeDollarSign,
    permissions: ["revenue.view"],
    description: "Real revenue goals, invoices, payments, forecasts, and attention queues."
  },
  {
    label: "Settings",
    href: "/app/settings/team",
    icon: Settings,
    permissions: ["team.view", "organization.manage", "audit.view"],
    description: "Team, role, audit, and organization controls."
  }
];

export function canSeeNavItem(userPermissions: string[], item: NavItem) {
  return hasAnyPermission(userPermissions, item.permissions);
}
