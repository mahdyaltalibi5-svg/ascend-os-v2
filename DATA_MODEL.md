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
- `PersonalPriority`: user-owned priority item scoped to an organization, with open/done/archived state, priority level, category, timeframe, due date/time, duration, revenue impact, sort order, pinned state, carryover count, completion time, archive time, and soft-delete time.
- `OperatingNote`: user-owned operating note scoped to an organization, with optional title, pinned state, category, tags, archive time, and note-to-priority conversion reference.
- `FocusBlock`: user-owned focus window scoped to an organization, with related priority, start/end timestamps, planned duration, actual focused minutes, active/paused/done/cancelled state, interruption count, completion note, and future calendar-event reference.
- `DailyPlan`: one daily planning/review record per organization, user, and date key, storing intention, top outcomes, risk, status, review answers, rating, and tomorrow's first action.
- `Goal`: user-owned daily/weekly/monthly/quarterly goal scoped to an organization, with metric type, unit, target, current progress, date range, status, owner, and completion/archive timestamps.
- `InAppNotification`: user-owned notification candidate scoped to an organization, with type, message, related entity, read time, dismiss time, and creation time.
- `RevenueGoal`: organization-owned financial goal with goal type, period, start/end dates, target cents, primary flag, owner, status, and notes.
- `Client`: lightweight organization-owned client record with contact details, status, source, notes, archival timestamp, and future external sync fields.
- `ServiceOffering`: editable organization-owned service catalog record with revenue category, billing type, optional default price cents, active state, and future provider sync fields.
- `RevenueContract`: organization-owned sold engagement linking client and optional service, with contracted cents, billing type, status, signed/start/end dates, MRR cents, deposit cents, and archival state.
- `Invoice`: organization-owned invoice linked to a client and optional contract, with total/paid/outstanding cents, issue date, due date, status, currency, provider fields, paid time, and archival state.
- `Payment`: organization-owned payment linked to client and optional invoice/contract, with amount cents, method, status, idempotency key, refund fields, provider fields, and payment date.
- `RecurringRevenueSchedule`: organization-owned expected recurring revenue record linked to client and contract, with amount cents, frequency, status, start/end dates, and next expected date.
- `RevenueForecastSnapshot`: immutable organization-owned forecast snapshot storing worst/expected/best cents, period totals, MRR, overdue amount, and safe assumptions JSON.
- `RevenueAdjustment`: organization-owned correction/refund/write-off/credit/fee record that preserves financial history instead of silently mutating old records.
- `Account`, `Session`, `VerificationToken`, `UserSession`: authentication-compatible entities and future session tracking.

Future business-owned tables must include `organizationId`, enforce server-side membership checks, and never rely only on frontend filtering.

Personal OS tables should usually include both `organizationId` and `userId` so personal work remains private to the user while still living inside the active organization boundary.

Daily plans must remain unique on `(organizationId, userId, dateKey)`. Focus blocks should keep timestamp and `calendarEventId` fields populated correctly so future calendar sync does not need a redesign.

Revenue tables use integer cents for stored money. Future financial tables must keep `organizationId`, avoid hard deletes, validate linked records by organization, and prefer adjustment records over silent historical rewrites.

Milestone 3 sales tables add `LeadCampaign`, `LeadBusiness`, `LeadContact`, `LeadCampaignMembership`, `LeadAnalysis`, `Prospect`, `OutreachAttempt`, `FollowUp`, `Appointment`, `Pipeline`, `PipelineStage`, `Opportunity`, `SalesGoal`, `ContactSuppression`, and `BackgroundJob`. These are all organization-scoped. Prospects, follow-ups, appointments, and opportunities also preserve user assignment IDs for own-vs-all permissions.

Lead deduplication uses Google Place ID, normalized phone, normalized domain, and normalized business name plus address. Won opportunity handoff links Revenue with Sales through `RevenueContract.sourceOpportunityId`.
