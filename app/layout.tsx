import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export const metadata: Metadata = {
  title: {
    default: "Ascend OS",
    template: "%s | Ascend OS"
  },
  description: "Application foundation for Ascend OS.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ascend OS"
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
