"use client";

import { useMemo, useState } from "react";
import { Bell, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PwaPreferences() {
  const [message, setMessage] = useState<string | null>(null);
  const hasPush =
    typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
  const installText = useMemo(() => {
    if (typeof navigator === "undefined") return "Install from your browser menu.";
    return /iphone|ipad/i.test(navigator.userAgent)
      ? "iPhone: Share, then Add to Home Screen."
      : "Android: browser menu, then Install app.";
  }, []);

  async function requestPush() {
    if (!hasPush) {
      setMessage("This browser does not support installable push notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMessage("Notifications are off for this device.");
      return;
    }
    setMessage(
      "Notification permission is ready. Delivery keys will be configured in a later milestone."
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <Smartphone aria-hidden className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Install Ascend Sales OS</p>
          <p className="mt-1 text-sm text-muted">{installText}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={requestPush} type="button" variant="secondary">
          <Bell aria-hidden className="h-4 w-4" />
          Notification opt-in
        </Button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </div>
  );
}
