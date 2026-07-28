# Data Model

- `User`: account identity, email, password hash, and auth metadata.
- `Organization`: tenant boundary for Ascend Web Development and future SaaS customers.
- `OrganizationMembership`: connects a user to an organization.
- `Role`: organization-scoped role such as Founder or Salesperson.
- `Permission`: global permission key definition.
- `RolePermission`: grants a permission to a role.
- `MembershipRole`: assigns organization roles to a membership.
- `Invitation`: models founder-created invitations with hashed tokens and status.
- `AuditEvent`: immutable security and operational event trail.
- `NotificationPreference`: user preferences scoped to an organization.
- `OrganizationBranding`: data-backed theme, colors, logo URL, and radius.
- `PersonalPriority`: user-owned priority item scoped to an organization, with open/done/archived state, urgency, notes, and completion time.
- `OperatingNote`: user-owned operating note scoped to an organization, with optional title and pinned state.
- `FocusBlock`: user-owned planned focus window scoped to an organization, with intention and planned/done/skipped state.
- `Account`, `Session`, `VerificationToken`, `UserSession`: authentication-compatible entities and future session tracking.

Future business-owned tables must include `organizationId`, enforce server-side membership checks, and never rely only on frontend filtering.

Personal OS tables should usually include both `organizationId` and `userId` so personal work remains private to the user while still living inside the active organization boundary.
