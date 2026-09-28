import { requireEventContext } from "../events/context.js";

export function normalizeScheduleItem(item) {
  const event = requireEventContext({ eventCode: item.eventCode });
  if (!item.id || !item.startsAt || !item.title) {
    throw new Error("Schedule item requires id, startsAt and title");
  }

  return {
    ...item,
    eventCode: event.code,
    eventSlug: event.slug,
    startsAt: new Date(item.startsAt).toISOString(),
    endsAt: item.endsAt ? new Date(item.endsAt).toISOString() : null,
  };
}

export function buildCombinedSchedule(items, { eventCode = null } = {}) {
  return items
    .map(normalizeScheduleItem)
    .filter((item) => !eventCode || item.eventCode === eventCode)
    .sort((a, b) => {
      const delta = new Date(a.startsAt) - new Date(b.startsAt);
      if (delta !== 0) return delta;
      return a.eventCode.localeCompare(b.eventCode);
    });
}
