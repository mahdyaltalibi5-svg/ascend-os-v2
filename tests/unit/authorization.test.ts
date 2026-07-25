import { describe, expect, it } from "vitest";

import {
  hasAnyPermission,
  hasPermission,
  isResourceOwnedByOrganization,
  validateActiveOrganizationSelection
} from "@/lib/authorization";

describe("authorization helpers", () => {
  it("checks required permissions without role-name coupling", () => {
    expect(hasPermission(["dashboard.view"], "dashboard.view")).toBe(true);
    expect(hasAnyPermission(["leads.view"], ["revenue.view", "leads.view"])).toBe(true);
    expect(hasPermission(["leads.view"], "audit.view")).toBe(false);
  });

  it("denies cross-organization resource access", () => {
    expect(isResourceOwnedByOrganization("org-a", "org-a")).toBe(true);
    expect(isResourceOwnedByOrganization("org-b", "org-a")).toBe(false);
  });

  it("validates active organization selection against memberships", () => {
    expect(validateActiveOrganizationSelection(["org-a", "org-b"], "org-b")).toBe("org-b");
    expect(validateActiveOrganizationSelection(["org-a"], "org-b")).toBe("org-a");
    expect(validateActiveOrganizationSelection([], "org-b")).toBeNull();
  });
});
