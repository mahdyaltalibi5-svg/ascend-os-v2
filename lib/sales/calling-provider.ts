import { normalizePhone } from "@/lib/sales/normalization";

export type CallingProvider = {
  id: "tel";
  label: string;
  hrefFor(phone: string | null | undefined): string;
  canPlaceCallsInBrowser: false;
};

export const telCallingProvider: CallingProvider = {
  id: "tel",
  label: "Native phone link",
  canPlaceCallsInBrowser: false,
  hrefFor(phone) {
    const normalized = normalizePhone(phone);
    return normalized ? `tel:+1${normalized}` : "";
  }
};
