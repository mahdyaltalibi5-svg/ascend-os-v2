import { describe, expect, it } from "vitest";

import { founderPermissions, salespersonPermissions } from "@/lib/permissions";

describe("default role permissions", () => {
  it("gives founders sensitive administration access", () => {
    expect(founderPermissions).toContain("revenue.view");
    expect(founderPermissions).toContain("roles.manage");
    expect(founderPermissions).toContain("audit.view");
  });

  it("keeps salespeople out of founder-only financial and administrative access", () => {
    expect(salespersonPermissions).toContain("dashboard.view");
    expect(salespersonPermissions).toContain("prospects.view_own");
    expect(salespersonPermissions).toContain("outreach.create");
    expect(salespersonPermissions).toContain("appointments.manage_own");
    expect(salespersonPermissions).not.toContain("leads.manage");
    expect(salespersonPermissions).not.toContain("leads.campaigns.manage");
    expect(salespersonPermissions).not.toContain("revenue.view");
    expect(salespersonPermissions).not.toContain("roles.manage");
    expect(salespersonPermissions).not.toContain("audit.view");
    expect(salespersonPermissions).not.toContain("organization.manage");
  });
});
