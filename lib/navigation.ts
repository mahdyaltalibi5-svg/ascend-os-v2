import {
  BadgeDollarSign,
  Bot,
  Building2,
  CalendarDays,
  Clock3,
  Megaphone,
  PhoneCall,
  RadioTower,
  Settings,
  ShieldCheck,
  Target,
  UsersRound
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
    label: "Command Center",
    href: "/app",
    icon: RadioTower,
    permissions: ["dashboard.view"],
    description: "Role-aware operating home."
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
    label: "Revenue",
    href: "/app/revenue",
    icon: BadgeDollarSign,
    permissions: ["revenue.view"],
    description: "Real revenue goals, invoices, payments, forecasts, and attention queues."
  },
  {
    label: "Clients",
    href: "/app/module/clients",
    icon: Building2,
    permissions: ["clients.view"],
    description: "Client operations arrive in later milestones."
  },
  {
    label: "Growth",
    href: "/app/module/growth",
    icon: Megaphone,
    permissions: ["leads.view"],
    description: "SEO, GBP, and attribution modules arrive in later milestones."
  },
  {
    label: "Personal Brand",
    href: "/app/module/personal-brand",
    icon: UsersRound,
    permissions: ["dashboard.view"],
    description: "Content planning arrives in a later milestone."
  },
  {
    label: "Agents",
    href: "/app/module/agents",
    icon: Bot,
    permissions: ["agents.view"],
    description: "Agent coordination arrives in a later milestone."
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
