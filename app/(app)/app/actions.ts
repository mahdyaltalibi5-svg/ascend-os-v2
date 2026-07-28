"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/server/db";
import { getCurrentSession } from "@/lib/server/auth";
import { requireOrganizationContext } from "@/lib/server/organization";
import { writeAuditEvent } from "@/lib/server/audit";
import {
  commandItemIdSchema,
  createFocusBlockSchema,
  createOperatingNoteSchema,
  createPrioritySchema
} from "@/lib/validation/personal-os";

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function requirePersonalCommandContext() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await requireOrganizationContext(session.user.id);
  return { userId: session.user.id, organizationId: context.organization.id };
}

export async function createPersonalPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createPrioritySchema.safeParse({
    title: textValue(formData, "title"),
    notes: textValue(formData, "notes") || undefined,
    urgency: textValue(formData, "urgency") || "normal"
  });

  if (!parsed.success) return;

  const priority = await prisma.personalPriority.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.data.title,
      notes: parsed.data.notes || null,
      urgency: parsed.data.urgency
    }
  });

  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "personal_priority.created",
    entityType: "PersonalPriority",
    entityId: priority.id,
    metadata: { urgency: priority.urgency }
  });

  revalidatePath("/app");
}

export async function completePersonalPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;

  const priority = await prisma.personalPriority.findFirst({
    where: {
      id: parsed.data.id,
      organizationId: context.organizationId,
      userId: context.userId
    }
  });

  if (!priority) return;

  await prisma.personalPriority.update({
    where: { id: priority.id },
    data: {
      status: "DONE",
      completedAt: new Date()
    }
  });

  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "personal_priority.completed",
    entityType: "PersonalPriority",
    entityId: priority.id
  });

  revalidatePath("/app");
}

export async function archivePersonalPriorityAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;

  const priority = await prisma.personalPriority.findFirst({
    where: {
      id: parsed.data.id,
      organizationId: context.organizationId,
      userId: context.userId
    }
  });

  if (!priority) return;

  await prisma.personalPriority.update({
    where: { id: priority.id },
    data: { status: "ARCHIVED" }
  });

  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "personal_priority.archived",
    entityType: "PersonalPriority",
    entityId: priority.id
  });

  revalidatePath("/app");
}

export async function createOperatingNoteAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createOperatingNoteSchema.safeParse({
    title: textValue(formData, "title") || undefined,
    body: textValue(formData, "body"),
    pinned: formData.get("pinned") === "on"
  });

  if (!parsed.success) return;

  const note = await prisma.operatingNote.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.data.title || null,
      body: parsed.data.body,
      pinned: parsed.data.pinned
    }
  });

  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "operating_note.created",
    entityType: "OperatingNote",
    entityId: note.id,
    metadata: { pinned: note.pinned }
  });

  revalidatePath("/app");
}

export async function createFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = createFocusBlockSchema.safeParse({
    title: textValue(formData, "title"),
    windowLabel: textValue(formData, "windowLabel"),
    intention: textValue(formData, "intention") || undefined
  });

  if (!parsed.success) return;

  const focusBlock = await prisma.focusBlock.create({
    data: {
      organizationId: context.organizationId,
      userId: context.userId,
      title: parsed.data.title,
      windowLabel: parsed.data.windowLabel,
      intention: parsed.data.intention || null
    }
  });

  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "focus_block.created",
    entityType: "FocusBlock",
    entityId: focusBlock.id,
    metadata: { windowLabel: focusBlock.windowLabel }
  });

  revalidatePath("/app");
}

export async function completeFocusBlockAction(formData: FormData) {
  const context = await requirePersonalCommandContext();
  const parsed = commandItemIdSchema.safeParse({ id: textValue(formData, "id") });
  if (!parsed.success) return;

  const focusBlock = await prisma.focusBlock.findFirst({
    where: {
      id: parsed.data.id,
      organizationId: context.organizationId,
      userId: context.userId
    }
  });

  if (!focusBlock) return;

  await prisma.focusBlock.update({
    where: { id: focusBlock.id },
    data: { status: "DONE" }
  });

  await writeAuditEvent({
    organizationId: context.organizationId,
    actorUserId: context.userId,
    action: "focus_block.completed",
    entityType: "FocusBlock",
    entityId: focusBlock.id
  });

  revalidatePath("/app");
}
