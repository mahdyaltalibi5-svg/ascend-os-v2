import dns from "node:dns/promises";
import net from "node:net";

const blockedHosts = new Set(["localhost", "metadata.google.internal"]);

export function isPrivateIp(address: string) {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0
    );
  }

  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized === "0:0:0:0:0:0:0:1"
  );
}

export async function assertSafeHttpUrl(rawUrl: string) {
  const url = parseHttpUrl(rawUrl);
  const host = url.hostname.toLowerCase();
  if (blockedHosts.has(host) || host.endsWith(".local")) {
    throw new Error("UNSAFE_HOST");
  }

  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error("PRIVATE_NETWORK_BLOCKED");
  }

  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("PRIVATE_NETWORK_BLOCKED");
  }

  return url;
}

export function parseHttpUrl(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) throw new Error("URL_REQUIRED");
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("UNSUPPORTED_PROTOCOL");
  }
  url.hash = "";
  return url;
}

export async function fetchWithSafety(
  rawUrl: string,
  options?: { maxBytes?: number; timeoutMs?: number }
) {
  const url = await assertSafeHttpUrl(rawUrl);
  const maxBytes = options?.maxBytes ?? 400_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 7000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "AscendOSLeadResearch/1.0 (+https://ascend-os-v2-app.vercel.app)"
      }
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("UNSUPPORTED_CONTENT_TYPE");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("EMPTY_RESPONSE");

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > maxBytes) throw new Error("RESPONSE_TOO_LARGE");
      chunks.push(value);
    }

    return {
      finalUrl: response.url,
      status: response.status,
      html: new TextDecoder().decode(Buffer.concat(chunks)),
      contentType
    };
  } finally {
    clearTimeout(timeout);
  }
}
