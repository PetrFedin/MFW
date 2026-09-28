import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_CODES } from "../src/events/catalog.js";
import { getEventExperience } from "../src/events/experience.js";
import {
  REGISTRATION_STATUS,
  createEventRegistration,
  eventRegistrationState,
  submitEventRegistration,
} from "../src/registration/registration.js";
import { buildEventSwitcher, switchEvent } from "../src/navigation/event-switcher.js";
import { buildCombinedSchedule } from "../src/schedule/combined.js";

test("MFW and BFS expose distinct visual/product shells", () => {
  const mfw = getEventExperience(EVENT_CODES.MOSCOW_FASHION_WEEK);
  const bfs = getEventExperience(EVENT_CODES.BRICS_FASHION_SUMMIT);

  assert.equal(mfw.shell, "mfw");
  assert.equal(bfs.shell, "bfs");
  assert.notEqual(mfw.visualMode, bfs.visualMode);
  assert.ok(mfw.navigation.includes("shows"));
  assert.ok(!bfs.navigation.includes("shows"));
  assert.ok(bfs.navigation.includes("delegations"));
  assert.ok(bfs.navigation.includes("b2b_meetings"));
});

test("global user can register for MFW without being registered for BFS", () => {
  const draft = createEventRegistration({
    id: "r1",
    userId: "u1",
    eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
    registrationType: "buyer",
  });
  const submitted = submitEventRegistration(draft, new Date("2026-09-01T10:00:00Z"));

  assert.equal(
    eventRegistrationState([submitted], "u1", {
      eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
    }).status,
    REGISTRATION_STATUS.SUBMITTED,
  );
  assert.equal(
    eventRegistrationState([submitted], "u1", {
      eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT,
    }).status,
    REGISTRATION_STATUS.NOT_STARTED,
  );
});

test("MFW-only registration types cannot be used for BFS", () => {
  assert.throws(
    () => createEventRegistration({
      id: "r2",
      userId: "u1",
      eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT,
      registrationType: "buyer",
    }),
    /not allowed/,
  );
});

test("switcher exposes registration state independently per event", () => {
  const mfw = {
    ...createEventRegistration({
      id: "r3",
      userId: "u1",
      eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
      registrationType: "visitor",
    }),
    status: REGISTRATION_STATUS.APPROVED,
  };

  const switcher = buildEventSwitcher({
    userId: "u1",
    registrations: [mfw],
    activeEventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
  });

  const mfwItem = switcher.find((item) => item.eventCode === EVENT_CODES.MOSCOW_FASHION_WEEK);
  const bfsItem = switcher.find((item) => item.eventCode === EVENT_CODES.BRICS_FASHION_SUMMIT);

  assert.equal(mfwItem.registrationStatus, REGISTRATION_STATUS.APPROVED);
  assert.equal(bfsItem.registrationStatus, REGISTRATION_STATUS.NOT_STARTED);
  assert.equal(mfwItem.active, true);
  assert.equal(bfsItem.active, false);
});

test("switching event preserves equivalent leaf route", () => {
  assert.equal(
    switchEvent({
      eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT,
      currentPath: "/events/moscow-fashion-week/my_schedule",
    }),
    "/events/brics-fashion-summit/my_schedule",
  );
});

test("combined schedule interleaves both events chronologically", () => {
  const items = buildCombinedSchedule([
    {
      id: "mfw-1",
      eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
      title: "MFW show",
      startsAt: "2026-09-28T10:00:00+03:00",
    },
    {
      id: "bfs-1",
      eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT,
      title: "BFS session",
      startsAt: "2026-09-28T09:00:00+03:00",
    },
  ]);

  assert.deepEqual(items.map((item) => item.id), ["bfs-1", "mfw-1"]);
});
