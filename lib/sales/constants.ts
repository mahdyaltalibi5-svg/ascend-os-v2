export const campaignStatuses = [
  "draft",
  "ready",
  "running",
  "paused",
  "completed",
  "failed",
  "archived"
] as const;

export const leadClassifications = [
  "hot",
  "warm",
  "cold",
  "too_small",
  "too_large",
  "bad_fit",
  "duplicate",
  "do_not_contact",
  "needs_review"
] as const;

export const prospectStatuses = [
  "new",
  "ready",
  "assigned",
  "attempting_contact",
  "connected",
  "qualified",
  "unqualified",
  "appointment_booked",
  "nurture",
  "do_not_contact",
  "converted",
  "lost",
  "archived"
] as const;

export const prospectPriorities = ["critical", "hot", "warm", "standard", "low"] as const;

export const outreachChannels = [
  "phone",
  "sms",
  "email",
  "voicemail",
  "linkedin",
  "in_person",
  "other"
] as const;

export const outreachOutcomes = [
  "no_answer",
  "voicemail",
  "wrong_number",
  "gatekeeper",
  "owner_unavailable",
  "owner_conversation",
  "not_interested",
  "callback_requested",
  "interested",
  "appointment_booked",
  "do_not_contact",
  "bad_fit",
  "failed",
  "other"
] as const;

export const followUpTypes = [
  "call",
  "sms",
  "email",
  "proposal",
  "appointment_confirmation",
  "general",
  "other"
] as const;

export const followUpStatuses = ["open", "completed", "missed", "cancelled", "archived"] as const;

export const appointmentStatuses = [
  "scheduled",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
  "rescheduled"
] as const;

export const meetingTypes = [
  "discovery",
  "sales_call",
  "follow_up",
  "proposal_review",
  "other"
] as const;

export const opportunityStatuses = ["open", "won", "lost", "nurture", "archived"] as const;

export const suppressionReasons = [
  "requested_stop",
  "do_not_call",
  "wrong_person",
  "legal_restriction",
  "internal_block",
  "bad_fit",
  "duplicate",
  "other"
] as const;

export const salesGoalMetrics = [
  "dials",
  "outreach_attempts",
  "conversations",
  "appointments_booked",
  "appointments_held",
  "opportunities_created",
  "proposals_sent",
  "deals_won",
  "revenue_won",
  "revenue_collected"
] as const;

export const jobStatuses = ["queued", "running", "completed", "failed", "cancelled"] as const;

export const jobTypes = [
  "lead_campaign_search",
  "place_details_enrichment",
  "website_analysis",
  "lead_scoring",
  "csv_import",
  "bulk_prospect_conversion"
] as const;

export const leadIndustryPresets = [
  {
    key: "hvac",
    label: "HVAC",
    searchTerms: ["hvac contractor", "heating and cooling company", "air conditioning repair"]
  },
  {
    key: "plumbing",
    label: "Plumbing",
    searchTerms: ["plumber", "plumbing contractor", "emergency plumber"]
  },
  {
    key: "roofing",
    label: "Roofing",
    searchTerms: ["roofing contractor", "roof repair", "commercial roofing"]
  },
  {
    key: "landscaping",
    label: "Landscaping",
    searchTerms: ["landscaper", "landscape contractor", "lawn care company"]
  },
  {
    key: "electrical",
    label: "Electrical",
    searchTerms: ["electrician", "electrical contractor", "residential electrician"]
  },
  {
    key: "solar",
    label: "Solar",
    searchTerms: ["solar installer", "solar contractor", "solar company"]
  },
  {
    key: "remodeling",
    label: "Remodeling",
    searchTerms: ["home remodeler", "kitchen remodeling", "bathroom remodeling"]
  },
  {
    key: "local_services",
    label: "Other local services",
    searchTerms: ["local service business", "home services", "contractor"]
  }
] as const;

export const defaultPipelineStages = [
  ["New prospect", 5],
  ["Attempting contact", 10],
  ["Connected", 18],
  ["Qualified", 28],
  ["Appointment booked", 40],
  ["Appointment held", 52],
  ["Proposal sent", 65],
  ["Follow-up", 70],
  ["Verbal agreement", 82],
  ["Contract sent", 90],
  ["Contract signed", 96],
  ["Deposit pending", 98],
  ["Won", 100, true],
  ["Lost", 0, false, true],
  ["Nurture", 12]
] as const;

export const defaultSalesGoals = [
  { metric: "outreach_attempts", targetValue: 300, periodType: "daily" },
  { metric: "conversations", targetValue: 200, periodType: "daily" },
  { metric: "appointments_booked", targetValue: 4, periodType: "daily" }
] as const;

export const salesLabelByValue: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  too_small: "Too small",
  too_large: "Too large",
  bad_fit: "Bad fit",
  duplicate: "Duplicate",
  do_not_contact: "Do not contact",
  needs_review: "Needs review",
  attempting_contact: "Attempting contact",
  appointment_booked: "Appointment booked",
  no_answer: "No answer",
  callback_requested: "Callback requested",
  owner_conversation: "Owner conversation",
  wrong_number: "Wrong number",
  no_show: "No-show",
  sales_call: "Sales call",
  proposal_review: "Proposal review"
};
