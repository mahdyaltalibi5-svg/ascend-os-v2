import { CircleDashed } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="min-h-36">
      <CardHeader>
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-raised text-primary">
          <CircleDashed aria-hidden className="h-4 w-4" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
