import {
  archivePersonalPriorityAction,
  completeFocusBlockAction,
  completePersonalPriorityAction,
  createFocusBlockAction,
  createOperatingNoteAction,
  createPersonalPriorityAction
} from "@/app/(app)/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonalCommandData } from "@/lib/server/personal-os";
import { CheckCircle2, Circle, Clock3, Flame, NotebookPen, Plus, Target, X } from "lucide-react";
import type { ReactNode } from "react";

type PersonalCommandCenterProps = {
  data: PersonalCommandData;
};

const urgencyTone: Record<string, string> = {
  low: "border-border bg-background/45 text-muted",
  normal: "border-primary/25 bg-primary/10 text-primary",
  high: "border-accent-warm/35 bg-accent-warm/10 text-accent-warm",
  critical: "border-danger/35 bg-danger/10 text-danger"
};

export function PersonalCommandCenter({ data }: PersonalCommandCenterProps) {
  const openCount = data.priorities.length;
  const focusCount = data.focusBlocks.length;
  const completedCount = data.completedToday.length;

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="scan-line ascend-command-card p-0">
          <div className="grid gap-6 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
            <div className="flex min-h-80 flex-col justify-between">
              <div>
                <p className="ascend-kicker">Personal command</p>
                <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
                  Decide fast. Move clean. Keep the thread.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                  Your actual operating layer: priorities, focus windows, and notes saved to the
                  database, scoped to you and the active organization.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <StatusTile label="Open" value={openCount} tone="primary" />
                <StatusTile label="Focus" value={focusCount} tone="mint" />
                <StatusTile label="Done" value={completedCount} tone="warm" />
              </div>
            </div>
            <div className="grid gap-3">
              <QuickPriorityForm />
              <QuickFocusForm />
            </div>
          </div>
        </Card>

        <Card className="ascend-surface-map">
          <CardHeader>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
              <NotebookPen aria-hidden className="h-5 w-5" />
            </div>
            <CardTitle>Operating note</CardTitle>
            <CardDescription>
              Store decisions, client context, ideas, and reminders before they scatter.
            </CardDescription>
          </CardHeader>
          <form action={createOperatingNoteAction} className="grid gap-3">
            <input className="ascend-input h-11" name="title" placeholder="Optional title" />
            <textarea
              className="ascend-input min-h-32 resize-y py-3"
              name="body"
              placeholder="Decision, thought, reminder, client context..."
              required
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-muted">
                <input className="h-4 w-4 accent-primary" name="pinned" type="checkbox" />
                Pin note
              </label>
              <Button type="submit">
                <Plus aria-hidden className="h-4 w-4" />
                Save note
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.82fr_0.82fr]">
        <CommandListCard
          empty="No open priorities yet. Capture the next real move."
          icon={<Target aria-hidden className="h-5 w-5" />}
          title="Priorities"
        >
          {data.priorities.map((priority) => (
            <div
              className="group rounded-md border border-border bg-background/40 p-3 transition duration-200 hover:border-border-strong hover:bg-surface-raised/70"
              key={priority.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{priority.title}</p>
                    <span
                      className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${
                        urgencyTone[priority.urgency] ?? urgencyTone.normal
                      }`}
                    >
                      {priority.urgency}
                    </span>
                  </div>
                  {priority.notes ? (
                    <p className="text-xs leading-5 text-muted">{priority.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-70 md:group-hover:opacity-100">
                  <form action={completePersonalPriorityAction}>
                    <input name="id" type="hidden" value={priority.id} />
                    <IconButton label="Complete priority" type="submit">
                      <CheckCircle2 aria-hidden className="h-4 w-4" />
                    </IconButton>
                  </form>
                  <form action={archivePersonalPriorityAction}>
                    <input name="id" type="hidden" value={priority.id} />
                    <IconButton label="Archive priority" type="submit">
                      <X aria-hidden className="h-4 w-4" />
                    </IconButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </CommandListCard>

        <CommandListCard
          empty="No focus blocks planned. Create one tight work window."
          icon={<Clock3 aria-hidden className="h-5 w-5" />}
          title="Focus blocks"
        >
          {data.focusBlocks.map((block) => (
            <div
              className="group rounded-md border border-border bg-background/40 p-3 transition duration-200 hover:border-border-strong hover:bg-surface-raised/70"
              key={block.id}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{block.title}</p>
                  <p className="mt-1 text-xs font-medium text-primary">{block.windowLabel}</p>
                </div>
                <form action={completeFocusBlockAction}>
                  <input name="id" type="hidden" value={block.id} />
                  <IconButton label="Complete focus block" type="submit">
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                  </IconButton>
                </form>
              </div>
              {block.intention ? (
                <p className="text-xs leading-5 text-muted">{block.intention}</p>
              ) : null}
            </div>
          ))}
        </CommandListCard>

        <CommandListCard
          empty="No notes yet. Save context before it disappears."
          icon={<NotebookPen aria-hidden className="h-5 w-5" />}
          title="Recent notes"
        >
          {data.notes.map((note) => (
            <div
              className="rounded-md border border-border bg-background/40 p-3 transition duration-200 hover:border-border-strong hover:bg-surface-raised/70"
              key={note.id}
            >
              <div className="mb-2 flex items-center gap-2">
                {note.pinned ? (
                  <Flame aria-hidden className="h-3.5 w-3.5 text-accent-warm" />
                ) : null}
                <p className="text-sm font-semibold text-foreground">
                  {note.title || "Untitled note"}
                </p>
              </div>
              <p className="line-clamp-4 text-xs leading-5 text-muted">{note.body}</p>
            </div>
          ))}
        </CommandListCard>
      </div>

      {data.completedToday.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Completed today</CardTitle>
            <CardDescription>
              Proof of motion. This is your current done list, not invented activity.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {data.completedToday.map((priority) => (
              <div
                className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-muted"
                key={priority.id}
              >
                <CheckCircle2 aria-hidden className="h-4 w-4 text-success" />
                {priority.title}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function QuickPriorityForm() {
  return (
    <form
      action={createPersonalPriorityAction}
      className="rounded-md border border-border bg-background/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <Circle aria-hidden className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Capture priority</p>
      </div>
      <div className="grid gap-2">
        <input
          className="ascend-input h-10"
          name="title"
          placeholder="What has to move?"
          required
        />
        <input className="ascend-input h-10" name="notes" placeholder="Context or next action" />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select className="ascend-input h-10" name="urgency" defaultValue="normal">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <Button size="sm" type="submit">
            Add
          </Button>
        </div>
      </div>
    </form>
  );
}

function QuickFocusForm() {
  return (
    <form
      action={createFocusBlockAction}
      className="rounded-md border border-border bg-background/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <Clock3 aria-hidden className="h-4 w-4 text-accent-mint" />
        <p className="text-sm font-semibold text-foreground">Plan focus</p>
      </div>
      <div className="grid gap-2">
        <input className="ascend-input h-10" name="title" placeholder="Focus block" required />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="ascend-input h-10"
            name="windowLabel"
            placeholder="Today 2-4 PM"
            required
          />
          <Button size="sm" type="submit">
            Add
          </Button>
        </div>
        <input className="ascend-input h-10" name="intention" placeholder="Definition of done" />
      </div>
    </form>
  );
}

function StatusTile({
  label,
  tone,
  value
}: {
  label: string;
  tone: "primary" | "mint" | "warm";
  value: number;
}) {
  const toneClass = {
    primary: "text-primary",
    mint: "text-accent-mint",
    warm: "text-accent-warm"
  }[tone];

  return (
    <div className="rounded-md border border-border bg-background/45 p-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]">
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase text-muted-soft">{label}</p>
    </div>
  );
}

function CommandListCard({
  children,
  empty,
  icon,
  title
}: {
  children: ReactNode;
  empty: string;
  icon: ReactNode;
  title: string;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <Card className="min-h-72">
      <CardHeader>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="grid gap-2">
        {hasChildren ? children : <p className="text-sm leading-6 text-muted">{empty}</p>}
      </div>
    </Card>
  );
}

function IconButton({
  children,
  label,
  type
}: {
  children: ReactNode;
  label: string;
  type: "button" | "submit";
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-raised text-muted transition hover:border-primary/45 hover:text-primary"
      type={type}
    >
      {children}
    </button>
  );
}
