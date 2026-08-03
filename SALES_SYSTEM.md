# Ascend OS Sales System

Milestone 1 added the CRM foundation. Milestone 2 added the owner-first call desk,
callback engine, role dashboards, and mobile PWA foundation. Milestone 3 adds the
Founder-controlled Utah HVAC/plumbing scraper and verification engine.

## Capabilities

- Lead campaigns with provider-backed job records.
- Manual lead entry and CSV lead import.
- Lead deduplication by Google Place ID, normalized phone, normalized domain, and normalized name plus address.
- Bounded deterministic website analysis with stored evidence.
- Lead scoring and classification.
- Lead-to-prospect conversion.
- Sales queue ranking.
- Outreach disposition tracking.
- Deterministic follow-up creation.
- Organization-wide contact suppression.
- Internal appointment booking.
- Pipeline stages and opportunities.
- Won-opportunity revenue handoff into `Client` and `RevenueContract`.
- Founder sales overview and salesperson workspace.
- Permission-aware CSV exports.
- Personal OS sales priority creation.
- Owner-first call desk at `/app/call-desk` with one active lead, native `tel:` links, manual timer, pending session recovery, keyboard shortcuts, and idempotent outcome submission.
- Immutable `CallAttempt` records with outcome flags for owner reached, full pitch, interest, callback requested, and appointment booked.
- Database-safe `LeadLock` records to prevent simultaneous serving of the same lead.
- Exact callback queue at `/app/callbacks` with due, overdue, later today, tomorrow, upcoming, completed, snooze, cancel, and completion flows.
- Internal calendar at `/app/calendar` for appointments, callbacks, and follow-ups without external calendar synchronization.
- Founder dashboard at `/app/founder` for company-wide calling metrics, team comparison, lead operations, attention items, stale lock release, and Owner Reach Score review.
- Sales dashboard at `/app/sales-dashboard` for personal calling metrics, due callbacks, appointments, queue counts, and install/push foundations.
- Explainable Owner Reach Score stored on leads and reviewable by Founder permissions.
- Founder scraper at `/app/scraper` for Google Places discovery, official website verification, owner evidence, marketing weakness analysis, separate owner/need/confidence scoring, human review, and approved lead creation.

## Honest Limits

- The embedded dialer is not implemented. The queue uses `tel:` links.
- Calendar sync is not implemented. Appointment records store future external calendar IDs.
- Browser and PWA surfaces do not claim they can silently place native cellular calls.
- Push delivery is not configured. Subscription storage and opt-in UI exist for a later provider.
- Predictive dialing, call recording, Twilio Voice, automated cold SMS, electricians, production custom domains, and multi-line parallel dialing are out of scope.
- Google Places campaigns require `GOOGLE_PLACES_API_KEY`; without it, campaigns are stored but launch into a clear failed/disabled state.
- Scraper jobs require `GOOGLE_PLACES_API_KEY`; without it, the scraper dashboard stays visible to Founder users but live jobs are disabled.
- Website research does not execute arbitrary JavaScript and does not crawl aggressively.
- AI summaries are not required for lead generation.

## Scraper Approval Rules

- Approved trades are only `HVAC` and `Plumbing`.
- Approved geography is Utah.
- Call-ready approval requires official company website or official Google Business Profile phone evidence.
- Source mismatches, duplicate normalized phones, suppressed numbers, off-scope trades, and non-Utah records stay out of the call queue.
- Owner names are stored only with evidence. The scraper never marks a number as `Owner Direct`.
- Approved and rejected review records are preserved even when later jobs rediscover the same company.

## Queue Ranking

The call desk queue prioritizes exact due callbacks, overdue callbacks, previously interested leads, prior owner answers, full pitches, highest Owner Reach Score, current best calling window, highest marketing-need or lead score, lowest attempt count, and oldest untouched eligible lead. It excludes do-not-call, wrong-number, suppressed, disqualified, closed, cross-assigned, active-locked, future-callback, outside-policy-hours, unverified-phone, and non-call-ready leads.

## Follow-Up Rules

- No answer: retry in two days.
- Voicemail: follow up in two days.
- Callback requested: next-day follow-up by default.
- Interested: next business follow-up unless an appointment is booked.
- Appointment booked: confirmation task.
- Wrong number: data-correction task.
- Do not contact: suppression and no future outreach.

## Revenue Handoff

When an opportunity is won, Founder can create or link a client, select a service, create a signed revenue contract, optionally create an initial invoice, and preserve the opportunity link through `RevenueContract.sourceOpportunityId`.
