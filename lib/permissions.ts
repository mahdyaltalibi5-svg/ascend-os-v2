export const PERMISSIONS = [
  "dashboard.view",
  "goals.view",
  "goals.manage",
  "leads.view",
  "leads.manage",
  "calls.view_own",
  "calls.view_all",
  "pipeline.view_own",
  "pipeline.view_all",
  "clients.view",
  "revenue.view",
  "team.view",
  "team.manage",
  "roles.manage",
  "integrations.manage",
  "organization.manage",
  "audit.view",
  "agents.view",
  "agents.manage"
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const permissionDescriptions: Record<PermissionKey, string> = {
  "dashboard.view": "View the organization command center.",
  "goals.view": "View revenue and operating goals.",
  "goals.manage": "Create and update revenue and operating goals.",
  "leads.view": "View lead records.",
  "leads.manage": "Create and update lead records.",
  "calls.view_own": "View personal call activity.",
  "calls.view_all": "View call activity for the organization.",
  "pipeline.view_own": "View owned sales pipeline records.",
  "pipeline.view_all": "View organization-wide sales pipeline records.",
  "clients.view": "View client records.",
  "revenue.view": "View organization revenue surfaces.",
  "team.view": "View team members.",
  "team.manage": "Invite and manage team members.",
  "roles.manage": "Manage roles and permissions.",
  "integrations.manage": "Manage organization integrations.",
  "organization.manage": "Manage organization settings and branding.",
  "audit.view": "View security and audit events.",
  "agents.view": "View agent workspace shells.",
  "agents.manage": "Manage agent configuration."
};

export const founderPermissions = [...PERMISSIONS];

export const salespersonPermissions: PermissionKey[] = [
  "dashboard.view",
  "leads.view",
  "leads.manage",
  "calls.view_own",
  "pipeline.view_own",
  "clients.view",
  "agents.view"
];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSIONS as readonly string[]).includes(value);
}
