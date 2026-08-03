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

export const crmTrades = ["HVAC", "Plumbing"] as const;

export const scraperDiscoveryStatuses = [
  "discovered",
  "needs_manual_review",
  "verified",
  "call_ready",
  "approved",
  "rejected",
  "duplicate",
  "suppressed",
  "source_mismatch",
  "not_target_trade",
  "outside_utah"
] as const;

export const scraperPhoneVerificationStatuses = [
  "official_website_verified",
  "official_google_profile_verified",
  "source_mismatch",
  "missing_phone",
  "no_website",
  "website_blocked",
  "unable_to_verify"
] as const;

export const scraperOwnerConfidenceLevels = [
  "verified_owner",
  "owner_signal",
  "company_line_only",
  "unverified"
] as const;

export const scraperUtahCities = [
  "Salt Lake City",
  "West Valley City",
  "West Jordan",
  "Provo",
  "Orem",
  "Sandy",
  "Ogden",
  "St. George",
  "Layton",
  "Lehi",
  "South Jordan",
  "Logan",
  "Murray",
  "Draper",
  "Bountiful"
] as const;

export const scraperTradeSearchTerms = {
  HVAC: ["hvac contractor", "air conditioning repair", "heating and cooling company"],
  Plumbing: ["plumber", "plumbing contractor", "emergency plumber"]
} as const satisfies Record<(typeof crmTrades)[number], readonly string[]>;

export const phoneTypes = [
  "direct_owner",
  "owner_operated_main_line",
  "official_company_line",
  "office_line",
  "unknown"
] as const;

export const callOutcomes = [
  "no_answer",
  "voicemail",
  "receptionist",
  "dispatcher",
  "employee",
  "owner_reached",
  "full_pitch_delivered",
  "interested",
  "callback_requested",
  "callback_completed",
  "appointment_booked",
  "not_interested",
  "wrong_number",
  "disqualified",
  "do_not_call"
] as const;

export const contactTypes = [
  "owner",
  "partner",
  "manager",
  "receptionist",
  "dispatcher",
  "employee",
  "voicemail",
  "unknown"
] as const;

export const callbackStatuses = [
  "scheduled",
  "due",
  "overdue",
  "completed",
  "canceled",
  "missed"
] as const;

export const callSessionStatuses = ["pending", "completed", "canceled"] as const;

export const leadOperationalStatuses = [
  "new",
  "attempted",
  "owner_reached",
  "interested",
  "appointment_booked",
  "showed",
  "proposal_sent",
  "closed_won",
  "closed_lost",
  "disqualified",
  "wrong_number",
  "do_not_call"
] as const;

export const phoneVerificationMethods = [
  "official_company_website",
  "official_google_business_profile",
  "other",
  "unverified"
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
  "full_pitch",
  "not_interested",
  "callback_requested",
  "interested",
  "appointment_booked",
  "proposal_sent",
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
  "phone",
  "google_meet",
  "zoom",
  "in_person",
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
  "lead_scraper_discovery",
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
  ["New", 5],
  ["Attempted", 10],
  ["Owner Reached", 18],
  ["Interested", 28],
  ["Appointment Booked", 40],
  ["Showed", 55],
  ["Proposal Sent", 70],
  ["Closed Won", 100, true],
  ["Closed Lost", 0, false, true],
  ["Disqualified", 0, false, true],
  ["Wrong Number", 0, false, true],
  ["Do Not Call", 0, false, true]
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
  discovered: "Discovered",
  verified: "Verified",
  call_ready: "Call ready",
  approved: "Approved",
  rejected: "Rejected",
  suppressed: "Suppressed",
  source_mismatch: "Source mismatch",
  not_target_trade: "Not target trade",
  outside_utah: "Outside Utah",
  official_website_verified: "Official website verified",
  official_google_profile_verified: "Official Google profile verified",
  missing_phone: "Missing phone",
  no_website: "No website",
  website_blocked: "Website blocked",
  unable_to_verify: "Unable to verify",
  verified_owner: "Verified owner",
  owner_signal: "Owner signal",
  company_line_only: "Company line only",
  direct_owner: "Owner Direct",
  owner_operated_main_line: "Owner-Operated Main Line",
  official_company_line: "Official Company Line",
  office_line: "Office Line",
  unknown: "Unknown",
  official_company_website: "Official company website",
  official_google_business_profile: "Official Google Business Profile",
  other: "Other",
  unverified: "Unverified",
  full_pitch: "Full pitch",
  proposal_sent: "Proposal sent",
  needs_review: "Needs review",
  attempting_contact: "Attempting contact",
  appointment_booked: "Appointment booked",
  no_answer: "No answer",
  receptionist: "Receptionist",
  dispatcher: "Dispatcher",
  employee: "Employee",
  owner_reached: "Owner reached",
  full_pitch_delivered: "Full pitch delivered",
  callback_requested: "Callback requested",
  callback_completed: "Callback completed",
  scheduled: "Scheduled",
  due: "Due",
  overdue: "Overdue",
  canceled: "Canceled",
  missed: "Missed",
  do_not_call: "Do not call",
  disqualified: "Disqualified",
  owner_conversation: "Owner conversation",
  wrong_number: "Wrong number",
  google_meet: "Google Meet",
  in_person: "In person",
  no_show: "No-show",
  sales_call: "Sales call",
  proposal_review: "Proposal review"
};
