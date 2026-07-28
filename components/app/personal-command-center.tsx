import {
  archiveOperatingNoteAction,
  archivePersonalPriorityAction,
  cancelFocusBlockAction,
  carryForwardPrioritiesAction,
  completeFocusBlockAction,
  completePersonalPriorityAction,
  convertNoteToPriorityAction,
  createFocusBlockAction,
  createGoalAction,
  createOperatingNoteAction,
  createPersonalPriorityAction,
  deletePersonalPriorityAction,
  duplicateFocusBlockAction,
  editFocusBlockAction,
  editOperatingNoteAction,
  editPersonalPriorityAction,
  executeCommandAction,
  movePriorityAction,
  pauseFocusBlockAction,
  reopenPersonalPriorityAction,
  startDailyPlanAction,
  startFocusBlockAction,
  submitDailyReviewAction,
  updateGoalProgressAction
} from "@/app/(app)/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  priorityCategories,
  priorityLevels,
  priorityTimeframes
} from "@/lib/personal-os/constants";
import { formatGoalValue, formatMoney } from "@/lib/personal-os/formatting";
import type { PersonalCommandData } from "@/lib/server/personal-os";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bell,
  CheckCircle2,
  Copy,
  Flag,
  Flame,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  WandSparkles,
  X
} from "lucide-react";
import type { ReactNode } from "react";

type PersonalCommandCenterProps = {
  data: PersonalCommandData;
  organizationName: string;
};

const levelTone: Record<string, string> = {
  critical: "border-danger/40 bg-danger/10 text-danger",
  high: "border-accent-warm/40 bg-accent-warm/10 text-accent-warm",
  medium: "border-primary/30 bg-primary/10 text-primary",
  low: "border-border bg-background/45 text-muted"
};

export function PersonalCommandCenter({ data, organizationName }: PersonalCommandCenterProps) {
  const highest = data.recommendation.highestValue;

  return (
    <section className="grid gap-5">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="ascend-kicker">Founder daily execution</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
            What needs to happen today?
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base">
            {organizationName} is using real saved priorities, focus blocks, goals, notes, and
            reviews. No fake metrics, no external AI dependency.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric"
            })}
          </StatusPill>
          <StatusPill>{data.todayPlan?.status ?? "No plan started"}</StatusPill>
        </div>
      </header>

      <Card className="scan-line p-4">
        <form
          action={executeCommandAction}
          className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center"
        >
          <label className="sr-only" htmlFor="command">
            Command Ascend OS
          </label>
          <div className="relative">
            <WandSparkles aria-hidden className="absolute left-3 top-3.5 h-4 w-4 text-primary" />
            <input
              className="ascend-input h-12 pl-10"
              id="command"
              name="command"
              placeholder='Try "Add follow up with Johnson HVAC as a critical priority for today"'
            />
          </div>
          <Button type="submit">Run command</Button>
          <div className="flex gap-2">
            <IconOnly label="Notifications">
              <Bell aria-hidden className="h-4 w-4" />
            </IconOnly>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DailyDirection data={data} />
        <RecommendationPanel data={data} />
      </div>

      <Scorecard data={data} />

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <PriorityPanel data={data} />
        <FocusPanel data={data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <GoalsPanel data={data} />
        <NotesPanel data={data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <NotificationsPanel data={data} />
        <ActivityPanel data={data} />
      </div>

      {highest ? (
        <div className="sticky bottom-3 z-20 rounded-md border border-primary/35 bg-surface/95 p-3 shadow-[var(--shadow-ascend)] backdrop-blur md:hidden">
          <p className="text-xs font-semibold uppercase text-primary">Next action</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{highest.title}</p>
        </div>
      ) : null}
    </section>
  );
}

function DailyDirection({ data }: { data: PersonalCommandData }) {
  const plan = data.todayPlan;

  return (
    <Card className="ascend-command-card">
      <CardHeader>
        <CardTitle>Daily direction</CardTitle>
        <CardDescription>
          Start the day with a short plan. End it with a fast review.
        </CardDescription>
      </CardHeader>
      {plan ? (
        <div className="grid gap-4">
          <div className="rounded-md border border-border bg-background/40 p-4">
            <p className="text-xs font-semibold uppercase text-muted-soft">Daily intention</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {plan.dailyIntention || "No intention written yet."}
            </p>
            <p className="mt-3 text-sm text-muted">Risk: {plan.mainRisk || "No risk captured."}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {[plan.topOutcome1, plan.topOutcome2, plan.topOutcome3].map((outcome, index) => (
              <div className="rounded-md border border-border bg-background/40 p-3" key={index}>
                <p className="text-xs font-semibold uppercase text-primary">Outcome {index + 1}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{outcome || "Not set"}</p>
              </div>
            ))}
          </div>
          {plan.endedAt ? <ReviewSummary plan={plan} /> : <DailyReviewForm planId={plan.id} />}
        </div>
      ) : (
        <StartDayForm data={data} />
      )}
    </Card>
  );
}

function StartDayForm({ data }: { data: PersonalCommandData }) {
  const unfinished = [...data.priorities.week, ...data.priorities.later].slice(0, 5);

  return (
    <div className="grid gap-4">
      {unfinished.length ? (
        <form
          action={carryForwardPrioritiesAction}
          className="rounded-md border border-border bg-background/40 p-3"
        >
          <p className="text-sm font-semibold text-foreground">Carryover review</p>
          <div className="mt-3 grid gap-2">
            {unfinished.map((priority) => (
              <label className="flex items-center gap-2 text-sm text-muted" key={priority.id}>
                <input
                  defaultChecked
                  className="h-4 w-4 accent-primary"
                  name="priorityId"
                  type="checkbox"
                  value={priority.id}
                />
                {priority.title}
              </label>
            ))}
          </div>
          <Button className="mt-3" size="sm" type="submit" variant="secondary">
            Carry selected to today
          </Button>
        </form>
      ) : null}
      <form action={startDailyPlanAction} className="grid gap-3">
        <input name="dateKey" type="hidden" value={data.todayKey} />
        <textarea
          className="ascend-input min-h-24 py-3"
          name="dailyIntention"
          placeholder="Daily intention"
        />
        <div className="grid gap-2 md:grid-cols-3">
          <input className="ascend-input h-11" name="topOutcome1" placeholder="Top outcome 1" />
          <input className="ascend-input h-11" name="topOutcome2" placeholder="Top outcome 2" />
          <input className="ascend-input h-11" name="topOutcome3" placeholder="Top outcome 3" />
        </div>
        <input
          className="ascend-input h-11"
          name="mainRisk"
          placeholder="Biggest risk or distraction"
        />
        <Button type="submit">
          <Play aria-hidden className="h-4 w-4" />
          Start day
        </Button>
      </form>
    </div>
  );
}

function DailyReviewForm({ planId }: { planId: string }) {
  return (
    <details className="rounded-md border border-border bg-background/40 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        End-day review
      </summary>
      <form action={submitDailyReviewAction} className="mt-3 grid gap-2">
        <input name="id" type="hidden" value={planId} />
        <textarea
          className="ascend-input min-h-20 py-3"
          name="completionSummary"
          placeholder="What did you complete?"
        />
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="ascend-input h-10"
            name="progressMade"
            placeholder="What created progress?"
          />
          <input className="ascend-input h-10" name="timeWasted" placeholder="What wasted time?" />
          <input className="ascend-input h-10" name="blockedBy" placeholder="What was blocked?" />
          <input
            className="ascend-input h-10"
            name="tomorrowFirstAction"
            placeholder="Tomorrow's first action"
          />
        </div>
        <input
          className="ascend-input h-10"
          name="carryForward"
          placeholder="What should carry forward?"
        />
        <input
          className="ascend-input h-10"
          name="removeTomorrow"
          placeholder="What should be removed?"
        />
        <label className="grid gap-1 text-xs font-semibold uppercase text-muted-soft">
          Productivity rating
          <input
            className="ascend-input h-10"
            defaultValue="7"
            max="10"
            min="1"
            name="founderRating"
            type="number"
          />
        </label>
        <Button type="submit">Complete review</Button>
      </form>
    </details>
  );
}

function ReviewSummary({ plan }: { plan: NonNullable<PersonalCommandData["todayPlan"]> }) {
  return (
    <div className="rounded-md border border-success/30 bg-success/10 p-3">
      <p className="text-sm font-semibold text-success">Day reviewed</p>
      <p className="mt-2 text-sm text-muted">{plan.completionSummary || "Review complete."}</p>
      <p className="mt-2 text-xs text-muted-soft">Rating: {plan.founderRating ?? "not rated"}/10</p>
    </div>
  );
}

function RecommendationPanel({ data }: { data: PersonalCommandData }) {
  const recommendation = data.recommendation;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ascend recommendation</CardTitle>
        <CardDescription>Generated from your current goals and priorities.</CardDescription>
      </CardHeader>
      {recommendation.highestValue ? (
        <div className="grid gap-3">
          <div className="rounded-md border border-primary/35 bg-primary/10 p-4">
            <p className="text-xs font-semibold uppercase text-primary">
              Highest-value next action
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {recommendation.highestValue.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">{recommendation.reasoning}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {recommendation.topThree.map((priority, index) => (
              <div
                className="rounded-md border border-border bg-background/40 p-3"
                key={priority.id}
              >
                <p className="text-xs font-semibold uppercase text-muted-soft">Top {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{priority.title}</p>
                <p className="mt-1 text-xs text-muted">Score {priority.score}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyCopy>No priorities yet. Capture the work before asking for a plan.</EmptyCopy>
      )}
    </Card>
  );
}

function Scorecard({ data }: { data: PersonalCommandData }) {
  const items = [
    ["Completed", data.scorecard.prioritiesCompletedToday],
    ["Remaining", data.scorecard.prioritiesRemaining],
    ["Planned focus", `${data.scorecard.plannedFocusMinutes}m`],
    ["Completed focus", `${data.scorecard.completedFocusMinutes}m`],
    ["Overdue", data.scorecard.overdueItems],
    ["Weekly goal", `${data.scorecard.weeklyGoalProgress}%`],
    ["Monthly goal", `${data.scorecard.monthlyGoalProgress}%`],
    ["Streak", data.scorecard.productivityStreak]
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {items.map(([label, value]) => (
        <Card className="p-4" key={label}>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs font-semibold uppercase text-muted-soft">{label}</p>
        </Card>
      ))}
    </div>
  );
}

function PriorityPanel({ data }: { data: PersonalCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today’s priorities</CardTitle>
        <CardDescription>
          Pinned, critical, overdue, and due-today work stays surfaced.
        </CardDescription>
      </CardHeader>
      <CreatePriorityForm />
      <div className="mt-4 grid gap-3">
        <PriorityList title="Today" priorities={data.priorities.today} />
        <PriorityList title="This week" priorities={data.priorities.week} />
        <PriorityList title="Later" priorities={data.priorities.later} />
      </div>
    </Card>
  );
}

function PriorityList({
  priorities,
  title
}: {
  priorities: PersonalCommandData["priorities"]["today"];
  title: string;
}) {
  if (!priorities.length) {
    return (
      <div className="rounded-md border border-border bg-background/35 p-3">
        <p className="text-sm text-muted">No {title.toLowerCase()} priorities.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold uppercase text-muted-soft">{title}</p>
      {priorities.map((priority) => (
        <div className="rounded-md border border-border bg-background/40 p-3" key={priority.id}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {priority.pinned ? (
                  <Flame aria-hidden className="h-4 w-4 text-accent-warm" />
                ) : null}
                <p className="font-semibold text-foreground">{priority.title}</p>
                <Badge className={levelTone[priority.priorityLevel] ?? levelTone.medium}>
                  {priority.priorityLevel}
                </Badge>
                <Badge>{priority.category.replace("_", " ")}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                {priority.description || priority.notes || "No description."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-soft">
                {priority.dueDate ? <span>Due {priority.dueDate.toLocaleDateString()}</span> : null}
                {priority.dueTime ? <span>{priority.dueTime}</span> : null}
                {priority.estimatedMinutes ? <span>{priority.estimatedMinutes}m</span> : null}
                {priority.estimatedRevenueImpact ? (
                  <span>{formatMoney(priority.estimatedRevenueImpact.toNumber())} impact</span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <TinyForm action={completePersonalPriorityAction} id={priority.id} label="Complete">
                <CheckCircle2 aria-hidden className="h-4 w-4" />
              </TinyForm>
              <TinyForm
                action={movePriorityAction}
                id={priority.id}
                label="Move up"
                extra={{ direction: "up" }}
              >
                <ArrowUp aria-hidden className="h-4 w-4" />
              </TinyForm>
              <TinyForm
                action={movePriorityAction}
                id={priority.id}
                label="Move down"
                extra={{ direction: "down" }}
              >
                <ArrowDown aria-hidden className="h-4 w-4" />
              </TinyForm>
              <TinyForm action={archivePersonalPriorityAction} id={priority.id} label="Archive">
                <Archive aria-hidden className="h-4 w-4" />
              </TinyForm>
              <TinyForm action={deletePersonalPriorityAction} id={priority.id} label="Delete">
                <Trash2 aria-hidden className="h-4 w-4" />
              </TinyForm>
            </div>
          </div>
          <EditPriorityDetails priority={priority} />
        </div>
      ))}
    </div>
  );
}

function CreatePriorityForm() {
  return (
    <details className="rounded-md border border-border bg-background/40 p-3" open>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        Create priority
      </summary>
      <form action={createPersonalPriorityAction} className="mt-3 grid gap-2">
        <PriorityFields />
        <Button type="submit">
          <Plus aria-hidden className="h-4 w-4" />
          Add priority
        </Button>
      </form>
    </details>
  );
}

function EditPriorityDetails({
  priority
}: {
  priority: PersonalCommandData["priorities"]["today"][number];
}) {
  return (
    <details className="mt-3 border-t border-border pt-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-soft">
        Edit
      </summary>
      <form action={editPersonalPriorityAction} className="mt-3 grid gap-2">
        <input name="id" type="hidden" value={priority.id} />
        <PriorityFields priority={priority} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="submit">
            Save changes
          </Button>
          {priority.status === "DONE" ? (
            <TinyForm action={reopenPersonalPriorityAction} id={priority.id} label="Reopen">
              <RefreshCcw aria-hidden className="h-4 w-4" />
            </TinyForm>
          ) : null}
        </div>
      </form>
    </details>
  );
}

function PriorityFields({
  priority
}: {
  priority?: PersonalCommandData["priorities"]["today"][number];
}) {
  return (
    <>
      <input
        className="ascend-input h-11"
        defaultValue={priority?.title}
        name="title"
        placeholder="Priority title"
        required
      />
      <textarea
        className="ascend-input min-h-20 py-3"
        defaultValue={priority?.description ?? priority?.notes ?? ""}
        name="description"
        placeholder="Description or next action"
      />
      <div className="grid gap-2 md:grid-cols-4">
        <Select
          name="priorityLevel"
          defaultValue={priority?.priorityLevel ?? "medium"}
          options={priorityLevels}
        />
        <Select
          name="category"
          defaultValue={priority?.category ?? "other"}
          options={priorityCategories}
        />
        <Select
          name="timeframe"
          defaultValue={priority?.timeframe ?? "today"}
          options={priorityTimeframes}
        />
        <input
          className="ascend-input h-11"
          defaultValue={priority?.estimatedMinutes ?? ""}
          min="0"
          name="estimatedMinutes"
          placeholder="Minutes"
          type="number"
        />
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <input
          className="ascend-input h-11"
          defaultValue={dateInputValue(priority?.dueDate)}
          name="dueDate"
          type="date"
        />
        <input
          className="ascend-input h-11"
          defaultValue={priority?.dueTime ?? ""}
          name="dueTime"
          type="time"
        />
        <input
          className="ascend-input h-11"
          defaultValue={priority?.estimatedRevenueImpact?.toString() ?? ""}
          min="0"
          name="estimatedRevenueImpact"
          placeholder="Revenue impact"
          type="number"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          className="h-4 w-4 accent-primary"
          defaultChecked={priority?.pinned ?? false}
          name="pinned"
          type="checkbox"
        />
        Pin priority
      </label>
    </>
  );
}

function FocusPanel({ data }: { data: PersonalCommandData }) {
  const active = data.focus.activeBlock;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Focus blocks</CardTitle>
        <CardDescription>
          Planned {data.focus.plannedFocusMinutes}m, completed {data.focus.completedFocusMinutes}m,
          remaining {data.focus.remainingFocusMinutes}m.
        </CardDescription>
      </CardHeader>
      {active ? (
        <div className="mb-4 rounded-md border border-primary/35 bg-primary/10 p-4">
          <p className="text-xs font-semibold uppercase text-primary">Current block</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{active.title}</p>
          <p className="text-sm text-muted">
            {active.status} · {active.plannedMinutes ?? 0}m planned
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {active.status === "ACTIVE" ? (
              <TinyForm action={pauseFocusBlockAction} id={active.id} label="Pause">
                <Pause aria-hidden className="h-4 w-4" />
              </TinyForm>
            ) : (
              <TinyForm action={startFocusBlockAction} id={active.id} label="Resume">
                <Play aria-hidden className="h-4 w-4" />
              </TinyForm>
            )}
            <TinyForm action={completeFocusBlockAction} id={active.id} label="Complete">
              <CheckCircle2 aria-hidden className="h-4 w-4" />
            </TinyForm>
          </div>
        </div>
      ) : null}
      <details className="rounded-md border border-border bg-background/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Create focus block
        </summary>
        <form action={createFocusBlockAction} className="mt-3 grid gap-2">
          <FocusFields priorities={data.allOpenPriorities} />
          <Button type="submit">Add focus block</Button>
        </form>
      </details>
      <div className="mt-4 grid gap-2">
        {data.focus.all.length ? (
          data.focus.all.map((block) => (
            <div className="rounded-md border border-border bg-background/40 p-3" key={block.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{block.title}</p>
                  <p className="text-sm text-muted">
                    {block.windowLabel} · {block.plannedMinutes ?? 0}m · {block.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <TinyForm action={startFocusBlockAction} id={block.id} label="Start">
                    <Play aria-hidden className="h-4 w-4" />
                  </TinyForm>
                  <TinyForm action={completeFocusBlockAction} id={block.id} label="Complete">
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                  </TinyForm>
                  <TinyForm action={duplicateFocusBlockAction} id={block.id} label="Duplicate">
                    <Copy aria-hidden className="h-4 w-4" />
                  </TinyForm>
                  <TinyForm action={cancelFocusBlockAction} id={block.id} label="Cancel">
                    <X aria-hidden className="h-4 w-4" />
                  </TinyForm>
                </div>
              </div>
              <details className="mt-3 border-t border-border pt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-soft">
                  Edit
                </summary>
                <form action={editFocusBlockAction} className="mt-3 grid gap-2">
                  <input name="id" type="hidden" value={block.id} />
                  <FocusFields block={block} priorities={data.allOpenPriorities} />
                  <Button size="sm" type="submit">
                    Save block
                  </Button>
                </form>
              </details>
            </div>
          ))
        ) : (
          <EmptyCopy>No focus blocks planned.</EmptyCopy>
        )}
      </div>
    </Card>
  );
}

function FocusFields({
  block,
  priorities
}: {
  block?: PersonalCommandData["focus"]["all"][number];
  priorities: PersonalCommandData["allOpenPriorities"];
}) {
  return (
    <>
      <input
        className="ascend-input h-11"
        defaultValue={block?.title}
        name="title"
        placeholder="Focus block title"
        required
      />
      <div className="grid gap-2 md:grid-cols-3">
        <input
          className="ascend-input h-11"
          defaultValue={block?.windowLabel ?? ""}
          name="windowLabel"
          placeholder="Today 2-4 PM"
          required
        />
        <input
          className="ascend-input h-11"
          defaultValue={dateTimeInputValue(block?.startsAt)}
          name="startsAt"
          type="datetime-local"
        />
        <input
          className="ascend-input h-11"
          defaultValue={block?.plannedMinutes ?? 60}
          min="5"
          name="plannedMinutes"
          type="number"
        />
      </div>
      <select
        className="ascend-input h-11"
        defaultValue={block?.priorityId ?? ""}
        name="priorityId"
      >
        <option value="">No related priority</option>
        {priorities.map((priority) => (
          <option key={priority.id} value={priority.id}>
            {priority.title}
          </option>
        ))}
      </select>
      <input
        className="ascend-input h-11"
        defaultValue={block?.intention ?? ""}
        name="intention"
        placeholder="Definition of done"
      />
    </>
  );
}

function GoalsPanel({ data }: { data: PersonalCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
        <CardDescription>Manual progress now, integration-ready later.</CardDescription>
      </CardHeader>
      <details className="rounded-md border border-border bg-background/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Create goal
        </summary>
        <form action={createGoalAction} className="mt-3 grid gap-2">
          <input
            className="ascend-input h-11"
            name="title"
            placeholder="Collect $50,000 this month"
            required
          />
          <textarea
            className="ascend-input min-h-20 py-3"
            name="description"
            placeholder="Why this matters"
          />
          <div className="grid gap-2 md:grid-cols-3">
            <Select
              name="goalType"
              defaultValue="monthly"
              options={["daily", "weekly", "monthly", "quarterly"]}
            />
            <Select
              name="unit"
              defaultValue="currency"
              options={["currency", "count", "percentage", "hours", "binary"]}
            />
            <input
              className="ascend-input h-11"
              min="1"
              name="targetValue"
              placeholder="Target"
              type="number"
              required
            />
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <input
              className="ascend-input h-11"
              defaultValue="0"
              min="0"
              name="currentValue"
              type="number"
            />
            <input className="ascend-input h-11" name="startDate" type="date" required />
            <input className="ascend-input h-11" name="endDate" type="date" required />
          </div>
          <Button type="submit">Create goal</Button>
        </form>
      </details>
      <div className="mt-4 grid gap-3">
        {data.goals.all.length ? (
          data.goals.all.map((goal) => (
            <div className="rounded-md border border-border bg-background/40 p-3" key={goal.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{goal.title}</p>
                  <p className="text-sm text-muted">
                    {formatGoalValue(goal.currentNumber, goal.unit)} /{" "}
                    {formatGoalValue(goal.targetNumber, goal.unit)} · {goal.daysRemaining} days left
                  </p>
                </div>
                <Badge>{goal.progress}%</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <form
                action={updateGoalProgressAction}
                className="mt-3 grid grid-cols-[1fr_auto] gap-2"
              >
                <input name="id" type="hidden" value={goal.id} />
                <input
                  className="ascend-input h-10"
                  defaultValue={goal.currentNumber}
                  min="0"
                  name="currentValue"
                  type="number"
                />
                <Button size="sm" type="submit">
                  Update
                </Button>
              </form>
            </div>
          ))
        ) : (
          <EmptyCopy>
            No goals yet. Create one monthly or weekly target to anchor the day.
          </EmptyCopy>
        )}
      </div>
    </Card>
  );
}

function NotesPanel({ data }: { data: PersonalCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Operating intelligence</CardTitle>
        <CardDescription>
          Pinned decisions, unresolved problems, lessons, and notes.
        </CardDescription>
      </CardHeader>
      <form className="mb-3 grid gap-2 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-3.5 h-4 w-4 text-muted-soft" />
          <input
            className="ascend-input h-11 pl-10"
            name="q"
            placeholder="Search notes visually for now"
          />
        </div>
        <Button type="button" variant="secondary">
          Search
        </Button>
      </form>
      <details className="rounded-md border border-border bg-background/40 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Create note
        </summary>
        <form action={createOperatingNoteAction} className="mt-3 grid gap-2">
          <NoteFields />
          <Button type="submit">Save note</Button>
        </form>
      </details>
      <div className="mt-4 grid gap-2">
        {data.notes.recent.length ? (
          data.notes.recent.map((note) => (
            <div className="rounded-md border border-border bg-background/40 p-3" key={note.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {note.pinned ? (
                      <Flame aria-hidden className="h-4 w-4 text-accent-warm" />
                    ) : null}
                    <p className="font-semibold text-foreground">{note.title || "Untitled note"}</p>
                    <Badge>{note.category.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{note.body}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <TinyForm
                    action={convertNoteToPriorityAction}
                    id={note.id}
                    label="Convert to priority"
                  >
                    <Flag aria-hidden className="h-4 w-4" />
                  </TinyForm>
                  <TinyForm action={archiveOperatingNoteAction} id={note.id} label="Archive note">
                    <Archive aria-hidden className="h-4 w-4" />
                  </TinyForm>
                </div>
              </div>
              <details className="mt-3 border-t border-border pt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase text-muted-soft">
                  Edit
                </summary>
                <form action={editOperatingNoteAction} className="mt-3 grid gap-2">
                  <input name="id" type="hidden" value={note.id} />
                  <NoteFields note={note} />
                  <Button size="sm" type="submit">
                    Save note
                  </Button>
                </form>
              </details>
            </div>
          ))
        ) : (
          <EmptyCopy>No notes yet. Capture operating context before it disappears.</EmptyCopy>
        )}
      </div>
    </Card>
  );
}

function NoteFields({ note }: { note?: PersonalCommandData["notes"]["recent"][number] }) {
  return (
    <>
      <input
        className="ascend-input h-11"
        defaultValue={note?.title ?? ""}
        name="title"
        placeholder="Optional title"
      />
      <textarea
        className="ascend-input min-h-24 py-3"
        defaultValue={note?.body ?? ""}
        name="body"
        placeholder="Decision, idea, lesson, problem..."
        required
      />
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          name="category"
          defaultValue={note?.category ?? "idea"}
          options={[
            "decision",
            "idea",
            "lesson",
            "problem",
            "client",
            "sales",
            "financial",
            "product",
            "personal_brand",
            "process",
            "other"
          ]}
        />
        <input
          className="ascend-input h-11"
          defaultValue={note?.tags.join(", ") ?? ""}
          name="tags"
          placeholder="Tags, comma separated"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          className="h-4 w-4 accent-primary"
          defaultChecked={note?.pinned ?? false}
          name="pinned"
          type="checkbox"
        />
        Pin note
      </label>
    </>
  );
}

function NotificationsPanel({ data }: { data: PersonalCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>In-app reminders generated from real records.</CardDescription>
      </CardHeader>
      <div className="grid gap-2">
        {data.notifications.length ? (
          data.notifications.map((notification) => (
            <div
              className="rounded-md border border-border bg-background/40 p-3"
              key={`${notification.type}-${notification.entityId ?? notification.title}`}
            >
              <p className="text-sm font-semibold text-foreground">{notification.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{notification.body}</p>
            </div>
          ))
        ) : (
          <EmptyCopy>No notifications. Nothing urgent needs your attention.</EmptyCopy>
        )}
      </div>
    </Card>
  );
}

function ActivityPanel({ data }: { data: PersonalCommandData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Audit-backed activity from your Personal OS.</CardDescription>
      </CardHeader>
      <div className="grid gap-2">
        {data.recentActivity.length ? (
          data.recentActivity.map((event) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-muted"
              key={event.id}
            >
              <span>{event.action.replaceAll("_", " ").replaceAll(".", " / ")}</span>
              <span className="text-xs text-muted-soft">
                {event.createdAt.toLocaleDateString()}
              </span>
            </div>
          ))
        ) : (
          <EmptyCopy>No activity yet. Your actions will appear here as they happen.</EmptyCopy>
        )}
      </div>
    </Card>
  );
}

function TinyForm({
  action,
  children,
  extra,
  id,
  label
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  extra?: Record<string, string>;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input name="id" type="hidden" value={id} />
      {extra
        ? Object.entries(extra).map(([key, value]) => (
            <input key={key} name={key} type="hidden" value={value} />
          ))
        : null}
      <button
        aria-label={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-raised text-muted transition hover:border-primary/45 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

function IconOnly({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-raised text-muted"
      type="button"
    >
      {children}
    </button>
  );
}

function Select({
  defaultValue,
  name,
  options
}: {
  defaultValue: string;
  name: string;
  options: readonly string[];
}) {
  return (
    <select className="ascend-input h-11" defaultValue={defaultValue} name={name}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`rounded-sm border border-border bg-background/45 px-2 py-0.5 text-[11px] font-semibold text-muted ${className}`}
    >
      {children}
    </span>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-surface/75 px-3 py-2 text-xs font-semibold uppercase text-muted shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
      {children}
    </span>
  );
}

function EmptyCopy({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-background/35 p-3 text-sm leading-6 text-muted">
      {children}
    </p>
  );
}

function dateInputValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function dateTimeInputValue(date?: Date | null) {
  return date ? date.toISOString().slice(0, 16) : "";
}
