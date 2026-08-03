"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, updateCallback } from "@/lib/server/call-desk";

export async function updateCallbackAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await getCallDeskContext(session.user.id);

  await updateCallback(context, {
    callbackId: String(formData.get("callbackId") ?? ""),
    status: String(formData.get("status") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? "") || null,
    reason: String(formData.get("reason") ?? "") || null,
    notes: String(formData.get("notes") ?? "") || null
  });

  revalidatePath("/app/callbacks");
  revalidatePath("/app/call-desk");
  revalidatePath("/app/sales-dashboard");
}
