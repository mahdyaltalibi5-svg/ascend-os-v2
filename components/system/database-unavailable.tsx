import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { databaseUnavailableMessage } from "@/lib/server/database";

export function DatabaseUnavailable() {
  return (
    <Card className="scan-line">
      <CardHeader>
        <CardTitle>Database not connected</CardTitle>
        <CardDescription>
          {databaseUnavailableMessage} See the README setup section or check{" "}
          <Link className="text-primary hover:underline" href="/api/health">
            /api/health
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-strong bg-surface-raised/80 px-4 py-2 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)] transition duration-200 hover:border-primary/50 hover:bg-surface-elevated"
          href="/"
        >
          Back to Ascend OS
        </Link>
      </div>
    </Card>
  );
}
