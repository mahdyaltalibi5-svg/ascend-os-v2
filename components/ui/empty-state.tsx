import { CircleDashed } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="group min-h-40">
      <CardHeader>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border-strong bg-surface-elevated text-primary shadow-[inset_0_1px_0_hsl(var(--foreground)/0.08)] transition duration-200 group-hover:border-primary/45">
            <CircleDashed aria-hidden className="h-4 w-4" />
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-border-strong to-transparent" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
