import crypto from "node:crypto";
import { requireEventContext } from "../events/context.js";

export function issueCredential({
  id, userId, eventCode, passType, entitlements = [], validFrom, validUntil, secret,
}) {
  const event = requireEventContext({ eventCode });
  if (!id || !userId || !passType || !secret) throw new Error("Credential fields and secret are required");
  if (!validFrom || !validUntil || new Date(validUntil) <= new Date(validFrom)) {
    throw new Error("Valid credential window is required");
  }
  const payload = {
    v: 1, id, userId, eventCode: event.code, passType,
    entitlements: [...new Set(entitlements)].sort(),
    validFrom: new Date(validFrom).toISOString(),
    validUntil: new Date(validUntil).toISOString(),
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  return { ...payload, token: `${encoded}.${signature}`, status: "active" };
}

export function verifyCredential(token, { eventCode, secret, now = new Date() }) {
  if (!token || !secret) return { valid: false, reason: "missing_token" };
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return { valid: false, reason: "malformed" };
  const expected = crypto.createHmac("sha256", secret).update(encoded).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, reason: "bad_signature" };

  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); }
  catch { return { valid: false, reason: "bad_payload" }; }

  if (payload.eventCode !== eventCode) return { valid: false, reason: "wrong_event" };
  if (now < new Date(payload.validFrom)) return { valid: false, reason: "not_yet_valid" };
  if (now > new Date(payload.validUntil)) return { valid: false, reason: "expired" };
  return { valid: true, payload };
}

export function myPasses(credentials, userId) {
  return credentials
    .filter((item) => item.userId === userId && item.status === "active")
    .sort((a,b) => a.eventCode.localeCompare(b.eventCode));
}
