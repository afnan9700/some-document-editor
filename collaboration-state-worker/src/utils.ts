import type { Envelope, EnvelopeMessage } from "./types.js";

export function toBooleanHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export function isAuthorizedBearer(headerValue: string | undefined, expectedToken: string): boolean {
  if (!headerValue) return false;
  const normalized = headerValue.trim();
  return normalized === `Bearer ${expectedToken}`;
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

export function base64ToUint8Array(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

export function isProbablyBase64(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

export function parseEnvelopeMessage(raw: string): EnvelopeMessage | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;

    const maybeEnvelopeMessage = parsed as Partial<EnvelopeMessage>;
    if (typeof maybeEnvelopeMessage.envelope === "object" && maybeEnvelopeMessage.envelope !== null) {
      return parsed as EnvelopeMessage;
    }

    // Backward-compatible fallback: accept a bare envelope too.
    return {
      originNodeId: "unknown",
      envelope: parsed as Envelope,
    };
  } catch {
    return null;
  }
}

export function normalizeUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
