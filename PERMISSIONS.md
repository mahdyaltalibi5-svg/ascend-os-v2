# Permissions

Permission keys use dot notation: `domain.action` or `domain.scope_action`.

## Founder

Founder receives all initial permissions, including full revenue access:

`dashboard.view`, `goals.view`, `goals.manage`, `leads.view`, `leads.manage`, `calls.view_own`, `calls.view_all`, `pipeline.view_own`, `pipeline.view_all`, `clients.view`, `clients.manage`, `revenue.view`, `revenue.manage`, `revenue.goals.manage`, `revenue.contracts.manage`, `revenue.invoices.manage`, `revenue.payments.manage`, `revenue.forecasts.view`, `revenue.forecasts.manage`, `services.view`, `services.manage`, `team.view`, `team.manage`, `roles.manage`, `integrations.manage`, `organization.manage`, `audit.view`, `agents.view`, `agents.manage`.

## Salesperson

Salesperson receives sales-focused permissions only:

`dashboard.view`, `leads.view`, `leads.manage`, `calls.view_own`, `pipeline.view_own`, `clients.view`, `agents.view`.

Salesperson does not receive financial, banking, role administration, organization management, integration management, or full audit access.

## Revenue Permissions

- `revenue.view`: view the Revenue Command Center.
- `revenue.manage`: manage general revenue records such as recurring schedules.
- `revenue.goals.manage`: create and update revenue goals.
- `revenue.contracts.manage`: create and update revenue contracts.
- `revenue.invoices.manage`: create and update invoices.
- `revenue.payments.manage`: record payments, refunds, and adjustments.
- `revenue.forecasts.view`: view forecast snapshots.
- `revenue.forecasts.manage`: create forecast snapshots.
- `clients.manage`: create and update clients.
- `services.view`: view service offerings.
- `services.manage`: create and update service offerings.

## Adding Permissions

1. Add the key to `lib/permissions.ts`.
2. Document the key here.
3. Seed the permission.
4. Assign it to default roles intentionally.
5. Add tests for new access behavior.

## Enforcement

The UI filters navigation from server-returned permissions. Server routes and pages must call authorization helpers before returning or mutating tenant data.

## Common Mistakes

- Do not hard-code access as `role === "founder"` across features.
- Do not trust an organization ID from the client.
- Do not query organization-owned records without an organization boundary.
- Do not weaken server checks because the UI already hides a route.
