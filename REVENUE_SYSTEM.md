# Revenue Command Center

Ascend OS Revenue Command Center is the manual financial operating layer for Ascend Web Development. It uses real stored records only. Stripe, Plaid, banking, bookkeeping, CRM pipelines, and ad attribution are not connected yet.

## Concepts

- Cash collected: succeeded payments dated inside the selected period, net of refunded payment amounts.
- Contracted revenue: signed, active, or completed contracts with signed dates inside the selected period.
- Expected cash: open invoice balances due inside the selected period plus active recurring revenue expected inside the period.
- MRR: active recurring contracts with an MRR amount as of the current date.
- New MRR: recurring contracts signed inside the selected period.
- Outstanding revenue: unpaid invoice balances, excluding paid, void, uncollectible, and archived invoices.
- Overdue revenue: outstanding invoice balances with due dates before now.

## Data Model

Revenue data is organization-owned:

- `RevenueGoal`
- `Client`
- `ServiceOffering`
- `RevenueContract`
- `Invoice`
- `Payment`
- `RecurringRevenueSchedule`
- `RevenueForecastSnapshot`
- `RevenueAdjustment`

Money is stored as integer cents. UI input accepts simple dollar strings and converts them once on the server. Generic money display uses en-US USD formatting.

## Manual Workflow

1. Set the monthly cash-collected goal.
2. Add or confirm service offerings.
3. Add clients.
4. Record signed contracts.
5. Create invoices.
6. Record payments.
7. Add recurring revenue schedules.
8. Create forecast snapshots.
9. Record refunds or adjustments instead of silently rewriting history.
10. Convert recommendations into Personal OS priorities.

## Invoice Behavior

Invoices store total, paid, and outstanding cents. When a succeeded payment is linked to an invoice, Ascend OS updates the invoice inside a transaction:

- Partial payment sets `partially_paid`.
- Full payment sets `paid` and records `paidAt`.
- Overpayment is rejected unless handled through an explicit adjustment workflow.

## Forecast Logic

Forecasts are deterministic:

- Worst case includes collected payments and a conservative share of open invoices.
- Expected case includes collected payments, weighted open invoices, and scheduled recurring revenue.
- Best case includes collected payments, open invoices, scheduled recurring revenue, and signed active contracts.

Forecast snapshots are historical records and should be treated as immutable.

## Recommendations

Ascend revenue recommendations are deterministic. They rank:

- Overdue invoices
- Partially paid invoices
- Signed contracts without invoices
- Upcoming recurring revenue
- Monthly goal gaps

Each recommendation includes impact, urgency, reason, linked entity data, and a one-click Personal OS priority action.

## Notifications

Revenue notifications are generated for due-soon invoices, overdue invoices, expected recurring payments, and goals behind pace. Dedupe keys prevent repeated identical alerts.

## Permissions

Founder receives all revenue permissions. Salesperson does not receive broad financial permissions by default and cannot access `/app/revenue`.

Revenue reads and mutations resolve the active organization server-side and validate linked records by organization before use.

## Stripe-Ready Boundary

Manual tracking is active. Stripe is not connected.

Schema fields are prepared for future sync:

- `externalProvider`
- `externalId` or provider-specific external IDs
- `lastSyncedAt`
- `syncStatus`
- idempotency keys for payments

Future Stripe work should add provider services for customer, invoice, payment, subscription, refund, webhook, idempotency, and sync-error handling without replacing the core ledger.

## Sales Revenue Handoff

Won opportunities can create linked clients and signed revenue contracts. The handoff runs in a transaction, prevents duplicate contract creation for the same opportunity, and stores `RevenueContract.sourceOpportunityId` so future reporting can attribute revenue to campaign, lead source, setter, closer, industry, location, and service.

## Known Limitations

- Revenue CSV import is deferred; revenue CSV export is implemented. Sales CSV lead import is implemented in `/app/sales`.
- Payment plans are modeled through contracts, invoices, and recurring schedules, but do not yet have a dedicated installment schedule UI.
- Forecast weights are deterministic defaults, not AI predictions.
- Invoice overdue status is derived from due date in the dashboard; a background job can later persist status transitions.
