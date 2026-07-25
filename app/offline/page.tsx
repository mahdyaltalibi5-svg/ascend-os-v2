import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ascend OS is offline</CardTitle>
          <CardDescription>
            Reconnect to continue. Authenticated organization data is not cached for offline use in
            this milestone.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
