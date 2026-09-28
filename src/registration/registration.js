import { requireEventContext } from "../events/context.js";

export const REGISTRATION_STATUS = Object.freeze({
  NOT_STARTED: "not_started",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

const EVENT_REGISTRATION_TYPES = Object.freeze({
  "mfw-2026-09": [
    "visitor",
    "buyer",
    "designer",
    "media",
    "speaker",
    "partner",
    "staff",
  ],
  "brics-fashion-summit-2026": [
    "visitor",
    "delegate",
    "speaker",
    "media",
    "partner",
    "staff",
  ],
});

export function allowedRegistrationTypes(input) {
  const event = requireEventContext(input);
  return EVENT_REGISTRATION_TYPES[event.code] ?? [];
}

export function createEventRegistration({
  id,
  userId,
  eventCode,
  registrationType,
  payload = {},
}) {
  const event = requireEventContext({ eventCode });
  const allowed = allowedRegistrationTypes({ eventCode });

  if (!id || !userId) throw new Error("id and userId are required");
  if (!allowed.includes(registrationType)) {
    throw new Error(`Registration type ${registrationType} is not allowed for ${event.code}`);
  }

  return {
    id,
    userId,
    eventCode: event.code,
    registrationType,
    status: REGISTRATION_STATUS.DRAFT,
    payload,
    submittedAt: null,
  };
}

export function submitEventRegistration(registration, now = new Date()) {
  if (registration.status !== REGISTRATION_STATUS.DRAFT) {
    throw new Error("Only draft registration can be submitted");
  }

  return {
    ...registration,
    status: REGISTRATION_STATUS.SUBMITTED,
    submittedAt: now.toISOString(),
  };
}

export function eventRegistrationState(registrations, userId, input) {
  const event = requireEventContext(input);
  const items = registrations.filter(
    (r) => r.userId === userId && r.eventCode === event.code,
  );

  if (items.length === 0) {
    return {
      eventCode: event.code,
      status: REGISTRATION_STATUS.NOT_STARTED,
      registrations: [],
    };
  }

  return {
    eventCode: event.code,
    status: items.some((r) => r.status === REGISTRATION_STATUS.APPROVED)
      ? REGISTRATION_STATUS.APPROVED
      : items[items.length - 1].status,
    registrations: items,
  };
}
