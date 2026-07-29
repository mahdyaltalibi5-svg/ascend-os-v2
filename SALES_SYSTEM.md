# Ascend OS Sales System

Milestone 3 adds the first real Lead Engine, CRM, and Sales Pipeline for Ascend OS.

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

## Honest Limits

- The embedded dialer is not implemented. The queue uses `tel:` links.
- Calendar sync is not implemented. Appointment records store future external calendar IDs.
- Google Places campaigns require `GOOGLE_PLACES_API_KEY`; without it, campaigns are stored but launch into a clear failed/disabled state.
- Website research does not execute arbitrary JavaScript and does not crawl aggressively.
- AI summaries are not required for lead generation.

## Queue Ranking

The queue prioritizes due callbacks, Hot prospects, no-attempt prospects, existing conversations, stale follow-ups, and estimated deal value. Do-not-contact, converted, lost, archived, appointment-booked, and exhausted no-answer prospects are excluded.

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
