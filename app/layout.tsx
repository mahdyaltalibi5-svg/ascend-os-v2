import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export const metadata: Metadata = {
  title: {
    default: "Ascend Sales OS",
    template: "%s | Ascend Sales OS"
  },
  description: "Owner-first CRM and call desk for Ascend Sales OS.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ascend Sales OS"
  }
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
