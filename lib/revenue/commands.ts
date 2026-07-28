import { parseMoneyToCents } from "@/lib/revenue/formatting";

export type RevenueCommand =
  | { type: "set_goal"; amountCents: number; period: "monthly" }
  | { type: "show_overdue" }
  | { type: "show_expected"; window: "week" | "month" }
  | { type: "goal_gap" }
  | { type: "create_priority_largest_overdue" }
  | {
      type: "record_payment";
      amountCents: number;
      clientName: string;
      requiresConfirmation: true;
    }
  | {
      type: "create_invoice";
      amountCents: number;
      clientName: string;
      requiresConfirmation: true;
    }
  | {
      type: "add_recurring";
      amountCents: number;
      clientName: string;
      requiresConfirmation: true;
    };

export function parseRevenueCommand(input: string): RevenueCommand | null {
  const text = input.trim();
  const lower = text.toLowerCase();

  const goalMatch = lower.match(
    /set (?:this month's |monthly )?(?:cash )?goal to (\$?[\d,]+(?:\.\d{1,2})?)/
  );
  if (goalMatch) {
    const amountCents = parseMoneyToCents(goalMatch[1]);
    return amountCents ? { type: "set_goal", amountCents, period: "monthly" } : null;
  }

  if (/show overdue invoices/.test(lower)) return { type: "show_overdue" };
  if (/how far|goal gap|from the monthly goal/.test(lower)) return { type: "goal_gap" };
  if (/expected this week/.test(lower)) return { type: "show_expected", window: "week" };
  if (/expected this month/.test(lower)) return { type: "show_expected", window: "month" };
  if (/priority .*largest overdue|largest overdue invoice/.test(lower)) {
    return { type: "create_priority_largest_overdue" };
  }

  const paymentMatch = text.match(
    /record (?:a )?\$?([\d,]+(?:\.\d{1,2})?) payment from (.+?)(?: today)?\.?$/i
  );
  if (paymentMatch) {
    const amountCents = parseMoneyToCents(paymentMatch[1]);
    if (!amountCents) return null;
    return {
      type: "record_payment",
      amountCents,
      clientName: paymentMatch[2].trim(),
      requiresConfirmation: true
    };
  }

  const invoiceMatch = text.match(
    /create (?:a )?\$?([\d,]+(?:\.\d{1,2})?) invoice for (.+?)(?: due .+)?\.?$/i
  );
  if (invoiceMatch) {
    const amountCents = parseMoneyToCents(invoiceMatch[1]);
    if (!amountCents) return null;
    return {
      type: "create_invoice",
      amountCents,
      clientName: invoiceMatch[2].trim(),
      requiresConfirmation: true
    };
  }

  const recurringMatch = text.match(
    /add (?:a )?\$?([\d,]+(?:\.\d{1,2})?) monthly .+ for (.+?)\.?$/i
  );
  if (recurringMatch) {
    const amountCents = parseMoneyToCents(recurringMatch[1]);
    if (!amountCents) return null;
    return {
      type: "add_recurring",
      amountCents,
      clientName: recurringMatch[2].trim(),
      requiresConfirmation: true
    };
  }

  return null;
}
