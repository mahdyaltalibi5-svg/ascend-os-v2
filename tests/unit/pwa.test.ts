import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("PWA manifest", () => {
  it("declares installable app metadata", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "public", "manifest.webmanifest"), "utf8")
    ) as {
      name: string;
      start_url: string;
      display: string;
      icons: unknown[];
    };

    expect(manifest.name).toBe("Ascend OS");
    expect(manifest.start_url).toBe("/app");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
