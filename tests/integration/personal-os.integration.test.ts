import { describe, expect, it } from "vitest";

const hasDedicatedDatabase = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDedicatedDatabase)("personal os database integration", () => {
  it("requires TEST_DATABASE_URL and must never target production", () => {
    expect(process.env.TEST_DATABASE_URL).toBeTruthy();
    expect(process.env.TEST_DATABASE_URL).not.toContain("db.prisma.io");
  });
});

describe.skipIf(hasDedicatedDatabase)("personal os database integration", () => {
  it("is skipped until a dedicated non-production PostgreSQL database is configured", () => {
    expect(hasDedicatedDatabase).toBe(false);
  });
});
