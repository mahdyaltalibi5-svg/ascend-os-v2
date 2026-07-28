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
  "clients.manage",
  "revenue.view",
  "revenue.manage",
  "revenue.goals.manage",
  "revenue.contracts.manage",
  "revenue.invoices.manage",
  "revenue.payments.manage",
  "revenue.forecasts.view",
  "revenue.forecasts.manage",
  "services.view",
  "services.manage",
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
  "clients.manage": "Create and update client records.",
  "revenue.view": "View organization revenue surfaces.",
  "revenue.manage": "Manage organization revenue records.",
  "revenue.goals.manage": "Create and update revenue goals.",
  "revenue.contracts.manage": "Create and update revenue contracts.",
  "revenue.invoices.manage": "Create and update revenue invoices.",
  "revenue.payments.manage": "Record and adjust revenue payments.",
  "revenue.forecasts.view": "View revenue forecast snapshots.",
  "revenue.forecasts.manage": "Create revenue forecast snapshots.",
  "services.view": "View service offerings.",
  "services.manage": "Create and update service offerings.",
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
