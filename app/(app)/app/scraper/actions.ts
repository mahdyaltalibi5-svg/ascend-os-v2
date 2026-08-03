"use server";

import { revalidatePath } from "next/cache";

import {
  approveScraperDiscovery,
  cancelScraperJob,
  createScraperJob,
  getScraperContext,
  processScraperJobs,
  rejectScraperDiscovery,
  retryScraperJob,
  updateScraperPolicy
} from "@/lib/server/scraper";
import { scraperJobSchema, scraperPolicySchema, scraperReviewSchema } from "@/lib/validation/sales";

export async function createScraperJobAction(formData: FormData) {
  const context = await getScraperContext();
  const parsed = scraperJobSchema.parse({
    sourceProvider: String(formData.get("sourceProvider") ?? "google_places"),
    cities: formData.getAll("cities"),
    trades: formData.getAll("trades"),
    limitPerSearch: formData.get("limitPerSearch")
  });
  await createScraperJob(context, parsed);
  revalidateScraper();
}

export async function processScraperJobsAction() {
  const context = await getScraperContext();
  if (!context.permissions.includes("scraper.manage")) throw new Error("FORBIDDEN");
  await processScraperJobs(1);
  revalidateScraper();
}

export async function cancelScraperJobAction(formData: FormData) {
  const context = await getScraperContext();
  await cancelScraperJob(context, String(formData.get("jobId") ?? ""));
  revalidateScraper();
}

export async function retryScraperJobAction(formData: FormData) {
  const context = await getScraperContext();
  await retryScraperJob(context, String(formData.get("jobId") ?? ""));
  revalidateScraper();
}

export async function approveScraperDiscoveryAction(formData: FormData) {
  const context = await getScraperContext();
  const parsed = scraperReviewSchema.parse({
    ...Object.fromEntries(formData),
    action: "approve"
  });
  await approveScraperDiscovery(context, parsed);
  revalidateScraper();
}

export async function rejectScraperDiscoveryAction(formData: FormData) {
  const context = await getScraperContext();
  const parsed = scraperReviewSchema.parse({
    ...Object.fromEntries(formData),
    action: "reject"
  });
  await rejectScraperDiscovery(context, parsed);
  revalidateScraper();
}

export async function updateScraperPolicyAction(formData: FormData) {
  const context = await getScraperContext();
  const parsed = scraperPolicySchema.parse(Object.fromEntries(formData));
  await updateScraperPolicy(context, parsed);
  revalidateScraper();
}

function revalidateScraper() {
  revalidatePath("/app");
  revalidatePath("/app/scraper");
  revalidatePath("/app/sales");
  revalidatePath("/app/call-desk");
}
