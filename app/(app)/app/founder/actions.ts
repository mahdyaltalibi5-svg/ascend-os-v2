"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/server/auth";
import { getCallDeskContext, releaseLeadLock, reviewOwnerReachScore } from "@/lib/server/call-desk";

export async function releaseLeadLockAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await getCallDeskContext(session.user.id);

  await releaseLeadLock(
    context,
    String(formData.get("lockId") ?? ""),
    String(formData.get("reason") ?? "") || "founder_review"
  );
  revalidatePath("/app/founder");
  revalidatePath("/app/call-desk");
}

export async function reviewOwnerReachScoreAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  const context = await getCallDeskContext(session.user.id);

  await reviewOwnerReachScore(context, {
    leadBusinessId: String(formData.get("leadBusinessId") ?? ""),
    ownerReachScore: Number(formData.get("ownerReachScore") ?? 0),
    ownerReachScoreReasons: String(formData.get("ownerReachScoreReasons") ?? ""),
    reason: String(formData.get("reason") ?? "") || "Founder review"
  });
  revalidatePath("/app/founder");
  revalidatePath("/app/call-desk");
}
