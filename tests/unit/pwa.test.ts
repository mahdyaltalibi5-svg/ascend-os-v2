import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("PWA manifest", () => {
  it("declares installable app metadata", () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), "public", "manifest.webmanifest"), "utf8")
    ) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      icons: unknown[];
      shortcuts: Array<{ url: string }>;
    };

    expect(manifest.name).toBe("Ascend Sales OS");
    expect(manifest.short_name).toBe("Ascend OS");
    expect(manifest.start_url).toBe("/app/call-desk");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.shortcuts.map((shortcut) => shortcut.url)).toEqual([
      "/app/call-desk",
      "/app/scraper",
      "/app/sales/queue"
    ]);
  });
});
