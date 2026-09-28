import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_CODES, EVENTS, listEvents } from "../src/events/catalog.js";
import { eventScopedKey, requireEventContext, resolveEventContext } from "../src/events/context.js";
import { createEventAuthority } from "../src/auth/authority.js";

test("catalog contains both parallel 2026 events", () => {
  assert.equal(listEvents().length, 2);
  assert.ok(EVENTS[EVENT_CODES.MOSCOW_FASHION_WEEK]);
  assert.ok(EVENTS[EVENT_CODES.BRICS_FASHION_SUMMIT]);
});

test("resolves event by code and slug", () => {
  assert.equal(
    resolveEventContext({ eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT }).slug,
    "brics-fashion-summit",
  );
  assert.equal(
    resolveEventContext({ eventSlug: "moscow-fashion-week" }).code,
    EVENT_CODES.MOSCOW_FASHION_WEEK,
  );
});

test("rejects missing event context instead of silently defaulting to MFW", () => {
  assert.throws(() => requireEventContext({}), /Unknown or missing event context/);
});

test("event-scoped keys prevent cross-event collision", () => {
  assert.notEqual(
    eventScopedKey(EVENT_CODES.MOSCOW_FASHION_WEEK, "speaker", "42"),
    eventScopedKey(EVENT_CODES.BRICS_FASHION_SUMMIT, "speaker", "42"),
  );
});

test("same user can have different roles in parallel events", () => {
  const auth = createEventAuthority({
    memberships: [
      { userId: "u1", eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK, roleCode: "buyer" },
      { userId: "u1", eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT, roleCode: "delegate" },
    ],
  });

  assert.equal(auth.hasRole("u1", "buyer", { eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK }), true);
  assert.equal(auth.hasRole("u1", "buyer", { eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT }), false);
  assert.equal(auth.hasRole("u1", "delegate", { eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT }), true);
});

test("entitlements never leak between MFW and BRICS+", () => {
  const auth = createEventAuthority({
    entitlements: [{
      userId: "u1",
      eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
      entitlementCode: "BACKSTAGE",
    }],
  });

  assert.equal(auth.hasEntitlement("u1", "BACKSTAGE", { eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK }), true);
  assert.equal(auth.hasEntitlement("u1", "BACKSTAGE", { eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT }), false);
});
