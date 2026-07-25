import {
  BadgeDollarSign,
  Bot,
  Building2,
  Megaphone,
  RadioTower,
  Settings,
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
    href: "/app/module/sales",
    icon: Target,
    permissions: ["leads.view", "calls.view_own", "pipeline.view_own"],
    description: "Lead, call, and pipeline surfaces arrive in later milestones."
  },
  {
    label: "Revenue",
    href: "/app/module/revenue",
    icon: BadgeDollarSign,
    permissions: ["revenue.view", "goals.view"],
    description: "Revenue goals and financial surfaces arrive in later milestones."
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
