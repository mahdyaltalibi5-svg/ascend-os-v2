import { describe, expect, it } from "vitest";

import { appNavigation, canSeeNavItem } from "@/lib/navigation";
import { founderPermissions, salespersonPermissions } from "@/lib/permissions";

describe("permission-aware navigation", () => {
  it("shows founder financial and audit entry points through settings", () => {
    const visible = appNavigation
      .filter((item) => canSeeNavItem(founderPermissions, item))
      .map((item) => item.label);

    expect(visible).toContain("Revenue");
    expect(visible).toContain("Settings");
  });

  it("hides revenue and sensitive administration from salespeople", () => {
    const visible = appNavigation
      .filter((item) => canSeeNavItem(salespersonPermissions, item))
      .map((item) => item.label);

    expect(visible).not.toContain("Revenue");
    expect(visible).not.toContain("Settings");
    expect(visible).toContain("Sales");
  });
});
