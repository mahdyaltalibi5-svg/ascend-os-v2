import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { databaseUnavailableMessage } from "@/lib/server/database";

export function DatabaseUnavailable() {
  return (
    <Card>
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
      <div className="px-5 pb-5">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/50"
          href="/"
        >
          Back to Ascend OS
        </Link>
      </div>
    </Card>
  );
}
