"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  Gauge,
  Loader2,
  Phone,
  RotateCcw,
  ShieldCheck,
  Target,
  X,
  Zap
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salesLabelByValue } from "@/lib/sales/constants";

type DeskLead = {
  id: string;
  businessName: string;
  ownerName: string | null;
  primaryPhone: string | null;
  normalizedPhone: string | null;
  telUrl: string;
  phoneType: string;
  phoneVerificationMethod: string;
  trade: string | null;
  city: string | null;
  websiteUrl: string | null;
  googleBusinessProfileUrl: string | null;
  leadScore: number;
  ownerReachScore: number;
  ownerReachScoreReasons: string[];
  assignedUserId: string | null;
  callReady: boolean;
  phoneVerificationSource: string | null;
  ownerVerificationSource: string | null;
  lastContactedAt: string | Date | null;
  nextFollowUpAt: string | Date | null;
  bestCallingWindowStart: string | null;
  bestCallingWindowEnd: string | null;
  suggestedOpener: string;
  notes: string | null;
  marketingNeedSignals: string[];
  websiteWeaknesses: string[];
  callAttempts: Array<{ outcome: string; contactType: string; startedAt: string | Date }>;
  callbacks: Array<{ scheduledAt: string | Date; status: string }>;
};

type PendingSession = {
  id: string;
  startedAt: string | Date;
};

type InitialDesk = {
  pendingSession: (PendingSession & { leadBusiness: DeskLead; telUrl: string }) | null;
  queue: DeskLead[];
};

const outcomeControls = [
  ["1", "no_answer"],
  ["2", "voicemail"],
  ["3", "receptionist"],
  ["", "dispatcher"],
  ["", "employee"],
  ["4", "owner_reached"],
  ["", "full_pitch_delivered"],
  ["", "interested"],
  ["5", "callback_requested"],
  ["6", "appointment_booked"],
  ["", "not_interested"],
  ["7", "wrong_number"],
  ["", "disqualified"],
  ["8", "do_not_call"]
] as const;

export function CallDeskClient({ initialData }: { initialData: InitialDesk }) {
  const [sessionKey] = useState(() => {
    if (typeof window === "undefined") return "server-session";
    const existing = window.localStorage.getItem("ascend_call_session_key");
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem("ascend_call_session_key", created);
    return created;
  });
  const [lead, setLead] = useState<DeskLead | null>(
    initialData.pendingSession?.leadBusiness ?? initialData.queue[0] ?? null
  );
  const [pendingSession, setPendingSession] = useState<PendingSession | null>(
    initialData.pendingSession
  );
  const [startedAt, setStartedAt] = useState<string | null>(
    initialData.pendingSession ? new Date(initialData.pendingSession.startedAt).toISOString() : null
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [appointmentStartAt, setAppointmentStartAt] = useState("");
  const [appointmentEndAt, setAppointmentEndAt] = useState("");

  const elapsed = useElapsedSeconds(startedAt);
  const attempts = lead?.callAttempts ?? [];

  useEffect(() => {
    const restored = window.localStorage.getItem("ascend_pending_call");
    const restoredNote = window.localStorage.getItem("ascend_pending_note");
    if (restoredNote) setNotes(restoredNote);
    if (!restored || pendingSession) return;
    try {
      const parsed = JSON.parse(restored) as {
        lead: DeskLead;
        pendingSession: PendingSession;
        startedAt: string;
      };
      setLead(parsed.lead);
      setPendingSession(parsed.pendingSession);
      setStartedAt(parsed.startedAt);
    } catch {
      window.localStorage.removeItem("ascend_pending_call");
    }
  }, [pendingSession]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      if (event.key === "Escape" && pendingSession) {
        event.preventDefault();
        void cancelCall();
        return;
      }
      if (event.key === " " && !busy) {
        event.preventDefault();
        if (!pendingSession && lead) void startCall();
        if (!pendingSession && !lead) void loadNextLead();
        return;
      }
      const match = outcomeControls.find(([shortcut]) => shortcut === event.key);
      if (match) {
        event.preventDefault();
        void submitOutcome(match[1]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function loadNextLead() {
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/call-desk/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionKey })
    }).catch(() => null);
    if (!response) {
      setBusy(false);
      setMessage("Connection lost. No new lead was served.");
      return;
    }
    const payload = await response
      .json()
      .catch(() => ({ message: "Unable to read server response." }));
    setBusy(false);
    if (!response.ok || !payload.lead) {
      setLead(null);
      setPendingSession(null);
      setStartedAt(null);
      setMessage(payload.message ?? "Queue empty.");
      return;
    }
    setLead(payload.lead);
    setPendingSession(payload.pendingSession);
    setStartedAt(new Date(payload.pendingSession.startedAt).toISOString());
    window.localStorage.setItem(
      "ascend_pending_call",
      JSON.stringify({
        lead: payload.lead,
        pendingSession: payload.pendingSession,
        startedAt: payload.pendingSession.startedAt
      })
    );
  }

  async function startCall() {
    if (!lead) return;
    setBusy(true);
    setMessage(null);
    const response = await fetch("/api/call-desk/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadBusinessId: lead.id, sessionKey })
    }).catch(() => null);
    if (!response) {
      setBusy(false);
      setMessage("Connection lost. Keep the lead open and try again before dialing.");
      return;
    }
    const payload = await response
      .json()
      .catch(() => ({ message: "Unable to read server response." }));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.message ?? "Unable to start the call.");
      return;
    }
    setPendingSession(payload.pendingSession);
    const started = new Date(payload.pendingSession.startedAt).toISOString();
    setStartedAt(started);
    window.localStorage.setItem(
      "ascend_pending_call",
      JSON.stringify({ lead, pendingSession: payload.pendingSession, startedAt: started })
    );
    window.location.href = lead.telUrl;
  }

  async function cancelCall() {
    if (!pendingSession) return;
    setBusy(true);
    await fetch("/api/call-desk/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingSessionId: pendingSession.id, reason: "not_placed" })
    }).catch(() => null);
    window.localStorage.removeItem("ascend_pending_call");
    setPendingSession(null);
    setStartedAt(null);
    setBusy(false);
  }

  async function submitOutcome(outcome: string) {
    if (!lead) return;
    if (["wrong_number", "do_not_call", "disqualified"].includes(outcome)) {
      const confirmed = window.confirm(
        `${label(outcome)} removes this lead from the call queue. Continue?`
      );
      if (!confirmed) return;
    }
    setBusy(true);
    setMessage(null);
    const now = new Date();
    const response = await fetch("/api/call-desk/outcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadBusinessId: lead.id,
        sessionKey,
        pendingSessionId: pendingSession?.id ?? "",
        idempotencyKey: `${sessionKey}:${lead.id}:${outcome}:${now.getTime()}`,
        startedAt: startedAt ?? now.toISOString(),
        endedAt: now.toISOString(),
        durationSeconds: elapsed,
        outcome,
        contactType: contactTypeForOutcome(outcome),
        notes,
        callbackAt,
        callbackReason: "Requested callback",
        appointmentStartAt,
        appointmentEndAt,
        appointmentMeetingType: "phone",
        appointmentNotes: notes
      })
    }).catch(() => null);
    if (!response) {
      window.localStorage.setItem(
        "ascend_pending_outcome",
        JSON.stringify({ leadBusinessId: lead.id, outcome, notes, savedAt: now.toISOString() })
      );
      setBusy(false);
      setMessage("Connection lost. Your draft outcome was kept locally; retry when reconnected.");
      return;
    }
    const payload = await response
      .json()
      .catch(() => ({ message: "Unable to read server response." }));
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.message ?? "Unable to record outcome.");
      return;
    }
    window.localStorage.removeItem("ascend_pending_call");
    window.localStorage.removeItem("ascend_pending_note");
    window.localStorage.removeItem("ascend_pending_outcome");
    setNotes("");
    setCallbackAt("");
    setAppointmentStartAt("");
    setAppointmentEndAt("");
    if (payload.next?.lead) {
      setLead(payload.next.lead);
      setPendingSession(payload.next.pendingSession);
      setStartedAt(new Date(payload.next.pendingSession.startedAt).toISOString());
      window.localStorage.setItem(
        "ascend_pending_call",
        JSON.stringify({
          lead: payload.next.lead,
          pendingSession: payload.next.pendingSession,
          startedAt: payload.next.pendingSession.startedAt
        })
      );
    } else {
      setLead(null);
      setPendingSession(null);
      setStartedAt(null);
      setMessage("Queue empty.");
    }
  }

  const phoneMeta = useMemo(
    () => [label(lead?.phoneType), lead?.trade, lead?.city].filter(Boolean).join(" | "),
    [lead]
  );
  const qualification = useMemo(() => {
    if (!lead) return [];
    return [
      { label: "Owner reach", value: lead.ownerReachScore, icon: Target },
      { label: "Lead fit", value: lead.leadScore, icon: Gauge },
      {
        label: "Need signals",
        value: [...lead.marketingNeedSignals, ...lead.websiteWeaknesses].length,
        icon: Zap
      },
      { label: "Attempts", value: attempts.length, icon: Phone }
    ];
  }, [attempts.length, lead]);

  return (
    <section className="grid gap-5 pb-44 sm:pb-6">
      {message ? (
        <div className="rounded-md border border-border bg-surface-raised px-4 py-3 text-sm text-muted">
          {message}
        </div>
      ) : null}
      {lead ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
            <div className="rounded-md border border-border bg-surface p-4 shadow-ascend">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-primary">Active lead</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-normal md:text-5xl">
                    {lead.businessName}
                  </h1>
                  <p className="mt-2 text-sm text-muted">{phoneMeta}</p>
                </div>
                <div className="rounded-md border border-primary/45 bg-primary/10 px-4 py-3 text-center">
                  <p className="text-xs font-semibold uppercase text-muted">Owner Reach</p>
                  <p className="text-3xl font-semibold text-primary">{lead.ownerReachScore}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <a
                  className="inline-flex min-h-16 items-center justify-center gap-3 rounded-md border border-primary/50 bg-primary/15 px-4 text-3xl font-semibold tracking-normal text-foreground transition hover:bg-primary/20 md:text-5xl"
                  href={lead.telUrl}
                >
                  <Phone aria-hidden className="h-7 w-7 shrink-0 text-primary" />
                  {lead.primaryPhone}
                </a>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                  <EvidenceBadge
                    good={lead.callReady}
                    label={lead.callReady ? "Verified" : "Blocked"}
                  />
                  <EvidenceBadge
                    good={
                      lead.phoneType !== "direct_owner" || Boolean(lead.ownerVerificationSource)
                    }
                    label={label(lead.phoneVerificationMethod)}
                  />
                </div>
              </div>
              <p className="mt-5 rounded-md border border-border bg-background/40 p-4 text-base leading-7">
                {lead.suggestedOpener}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                {qualification.map((item) => (
                  <div
                    className="rounded-md border border-border bg-background/35 p-3"
                    key={item.label}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
                      <item.icon aria-hidden className="h-4 w-4 text-primary" />
                      {item.label}
                    </div>
                    <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Info label="Phone evidence" value={lead.phoneVerificationSource ?? "Missing"} />
                <Info
                  label="Owner evidence"
                  value={lead.ownerVerificationSource ?? "Not verified"}
                />
                <Info label="Owner or ask-for" value={lead.ownerName ?? "Ask for the owner"} />
                <Info label="Website" value={lead.websiteUrl ?? "Missing"} />
                <Info label="Google profile" value={lead.googleBusinessProfileUrl ?? "Missing"} />
                <Info
                  label="Call-ready"
                  value={lead.callReady ? "Verified and call ready" : "Not ready"}
                />
                <Info label="Last contacted" value={formatDate(lead.lastContactedAt)} />
                <Info label="Next follow-up" value={formatDate(lead.nextFollowUpAt)} />
                <Info
                  label="Best window"
                  value={
                    lead.bestCallingWindowStart && lead.bestCallingWindowEnd
                      ? `${lead.bestCallingWindowStart}-${lead.bestCallingWindowEnd}`
                      : "Use policy hours"
                  }
                />
                <Info label="Lead score" value={`${lead.leadScore}/100`} />
              </div>
            </div>
            <aside className="grid content-start gap-3">
              <Panel title="Qualification focus">
                {lead.callReady ? (
                  <SignalLine icon={ShieldCheck} text="Official phone evidence is stored." />
                ) : (
                  <SignalLine
                    icon={AlertTriangle}
                    text="Do not dial until phone evidence is fixed."
                  />
                )}
                <SignalLine
                  icon={Target}
                  text={
                    lead.ownerName
                      ? `Ask for ${lead.ownerName}.`
                      : "Ask for the owner by role, not a guessed name."
                  }
                />
                <SignalLine
                  icon={Zap}
                  text={
                    [...lead.marketingNeedSignals, ...lead.websiteWeaknesses][0] ??
                    "Lead has no stored marketing weakness yet."
                  }
                />
              </Panel>
              <Panel title="Previous attempts">
                {attempts.length ? (
                  attempts.map((attempt) => (
                    <p
                      className="text-sm text-muted"
                      key={`${attempt.outcome}-${attempt.startedAt}`}
                    >
                      {label(attempt.outcome)} at {formatDate(attempt.startedAt)}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted">No attempts yet.</p>
                )}
              </Panel>
              <Panel title="Owner Reach reasons">
                {lead.ownerReachScoreReasons.map((reason) => (
                  <p className="text-sm text-muted" key={reason}>
                    {reason}
                  </p>
                ))}
              </Panel>
              <Panel title="Signals">
                <p className="text-sm text-muted">
                  {[...lead.marketingNeedSignals, ...lead.websiteWeaknesses].join(", ") ||
                    "No stored signals yet."}
                </p>
              </Panel>
              <Panel title="Evidence links">
                <EvidenceLink href={lead.websiteUrl} label="Website" />
                <EvidenceLink href={lead.googleBusinessProfileUrl} label="Google profile" />
                <EvidenceLink href={lead.phoneVerificationSource} label="Phone source" />
              </Panel>
            </aside>
          </div>

          <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
            <textarea
              className="ascend-input min-h-24 py-3"
              onChange={(event) => {
                setNotes(event.target.value);
                window.localStorage.setItem("ascend_pending_note", event.target.value);
              }}
              placeholder="Call notes"
              value={notes}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Callback time"
                type="datetime-local"
                value={callbackAt}
                onChange={(event) => setCallbackAt(event.target.value)}
              />
              <Input
                label="Appointment start"
                type="datetime-local"
                value={appointmentStartAt}
                onChange={(event) => setAppointmentStartAt(event.target.value)}
              />
              <Input
                label="Appointment end"
                type="datetime-local"
                value={appointmentEndAt}
                onChange={(event) => setAppointmentEndAt(event.target.value)}
              />
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:static lg:border lg:bg-surface lg:p-4">
            <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[auto_1fr]">
              <div className="grid grid-cols-2 gap-2 lg:flex">
                <Button
                  className="h-14 text-base lg:h-11 lg:text-sm"
                  disabled={busy}
                  onClick={pendingSession ? undefined : startCall}
                  type="button"
                >
                  {busy ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone aria-hidden className="h-4 w-4" />
                  )}
                  {pendingSession ? `${formatSeconds(elapsed)}` : "Call"}
                </Button>
                {pendingSession ? (
                  <Button
                    className="h-14 text-base lg:h-11 lg:text-sm"
                    disabled={busy}
                    onClick={cancelCall}
                    type="button"
                    variant="secondary"
                  >
                    <X aria-hidden className="h-4 w-4" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    className="h-14 text-base lg:h-11 lg:text-sm"
                    disabled={busy}
                    onClick={loadNextLead}
                    type="button"
                    variant="secondary"
                  >
                    <RotateCcw aria-hidden className="h-4 w-4" />
                    Next
                  </Button>
                )}
              </div>
              <div className="grid max-h-44 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-4 xl:grid-cols-7">
                {outcomeControls.map(([shortcut, outcome]) => (
                  <Button
                    className="min-h-12 text-sm"
                    disabled={busy}
                    key={outcome}
                    onClick={() => submitOutcome(outcome)}
                    type="button"
                    variant={
                      ["wrong_number", "do_not_call", "disqualified"].includes(outcome)
                        ? "danger"
                        : "secondary"
                    }
                  >
                    {label(outcome)}
                    {shortcut ? <span className="text-xs text-muted"> {shortcut}</span> : null}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-border bg-surface p-8 text-center">
          <CalendarClock aria-hidden className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Queue empty</h1>
          <p className="mt-2 text-sm text-muted">
            No verified assigned leads are eligible right now.
          </p>
          <Button className="mt-5" disabled={busy} onClick={loadNextLead} type="button">
            Check again
          </Button>
        </div>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 grid gap-2">{children}</div>
    </div>
  );
}

function EvidenceBadge({ good, label }: { good: boolean; label: string }) {
  return (
    <div
      className={
        good
          ? "rounded-md border border-success/40 bg-success/10 px-3 py-2 text-center text-xs font-semibold text-success"
          : "rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-center text-xs font-semibold text-danger"
      }
    >
      {label}
    </div>
  );
}

function SignalLine({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <p className="flex items-start gap-2 text-sm leading-5 text-muted">
      <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </p>
  );
}

function EvidenceLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <p className="text-sm text-muted">{label}: Missing</p>;
  return (
    <a
      className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-soft"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
      {label}
    </a>
  );
}

function label(value?: string | null) {
  if (!value) return "";
  return salesLabelByValue[value] ?? value.replace(/_/g, " ");
}

function formatDate(value: string | Date | null) {
  if (!value) return "None";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function useElapsedSeconds(startedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (!startedAt) return 0;
  return Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));
}

function contactTypeForOutcome(outcome: string) {
  const contactTypes: Record<string, string> = {
    voicemail: "voicemail",
    receptionist: "receptionist",
    dispatcher: "dispatcher",
    employee: "employee",
    owner_reached: "owner",
    full_pitch_delivered: "owner",
    interested: "owner",
    callback_requested: "owner",
    appointment_booked: "owner"
  };
  return contactTypes[outcome] ?? "unknown";
}
