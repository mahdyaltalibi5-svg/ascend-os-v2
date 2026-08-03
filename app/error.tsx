"use client";

import Link from "next/link";

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  const databaseIssue =
    error.message.includes("database") ||
    error.message.includes("Prisma") ||
    error.message.includes("DATABASE_URL");
  const crmMessage = messageForKnownError(error.message);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-lg rounded-md border border-border bg-surface p-6 shadow-ascend">
        <h1 className="text-2xl font-semibold tracking-normal">
          {databaseIssue
            ? "Database not connected"
            : crmMessage
              ? "CRM action needs attention"
              : "Ascend OS hit an error"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {databaseIssue
            ? "Ascend OS is running, but the database is not connected. Check DATABASE_URL, run migrations, and restart the app."
            : crmMessage
              ? crmMessage
              : "The page could not finish loading. Try again, or check the development server logs."}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium"
            href="/"
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

function messageForKnownError(message: string) {
  const messages: Record<string, string> = {
    DUPLICATE_NORMALIZED_PHONE:
      "That normalized phone number already exists. Use the existing lead instead of creating a duplicate.",
    SUPPRESSED_NUMBER:
      "That phone number is permanently suppressed and cannot be added to the call queue.",
    INVALID_PHONE: "Enter a valid phone number before saving the lead.",
    INVALID_STATE: "Milestone 1 only supports Utah leads.",
    INVALID_TRADE: "Choose HVAC or Plumbing for the lead trade.",
    INVALID_ASSIGNEE: "Choose Mahdy, Logan, or another active team member for assignment.",
    CALL_READY_REQUIRES_OFFICIAL_PHONE_EVIDENCE:
      "Call Ready requires a verified phone source from the official company website or official Google Business Profile.",
    OWNER_DIRECT_REQUIRES_EVIDENCE:
      "Owner Direct requires evidence that the number belongs directly to the owner.",
    CONTACT_SUPPRESSED: "This contact is suppressed and cannot be called.",
    FORBIDDEN: "You do not have permission to perform that action."
  };
  return messages[message] ?? null;
}
