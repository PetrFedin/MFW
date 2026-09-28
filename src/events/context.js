import { EVENTS, listEvents } from "./catalog.js";

export function resolveEventContext(input = {}) {
  const code = input.eventCode?.trim();
  const slug = input.eventSlug?.trim();

  if (code && EVENTS[code]) return EVENTS[code];

  if (slug) {
    const match = listEvents().find((event) => event.slug === slug);
    if (match) return match;
  }

  return null;
}

export function requireEventContext(input = {}) {
  const event = resolveEventContext(input);
  if (!event) {
    const known = listEvents().map((item) => item.code).join(", ");
    throw new Error(`Unknown or missing event context. Known events: ${known}`);
  }
  return event;
}

export function eventScopedKey(eventCode, entityType, entityId) {
  if (!eventCode || !entityType || !entityId) {
    throw new Error("eventCode, entityType and entityId are required");
  }
  return `${eventCode}:${entityType}:${entityId}`;
}
