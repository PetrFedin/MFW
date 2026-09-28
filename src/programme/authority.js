import { requireEventContext } from "../events/context.js";

export function createProgrammeItem({
  id, eventCode, localKey, type, title, startsAt, endsAt = null,
  venueCode = null, hallCode = null, registrationRequired = false,
  capacity = null, metadata = {},
}) {
  const event = requireEventContext({ eventCode });
  if (!id || !localKey || !type || !title || !startsAt) {
    throw new Error("Programme item requires id, localKey, type, title and startsAt");
  }
  if (endsAt && new Date(endsAt) < new Date(startsAt)) {
    throw new Error("Programme item cannot end before it starts");
  }
  return {
    id, eventCode: event.code, localKey, type, title,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: endsAt ? new Date(endsAt).toISOString() : null,
    venueCode, hallCode, registrationRequired, capacity, metadata,
    status: "scheduled",
  };
}

export function programmeForEvent(items, input) {
  const event = requireEventContext(input);
  return items
    .filter((item) => item.eventCode === event.code && item.status !== "cancelled")
    .sort((a,b) => new Date(a.startsAt) - new Date(b.startsAt));
}

export function canSaveProgrammeItem({ registrationStatus, item }) {
  if (!item.registrationRequired) return true;
  return registrationStatus === "approved";
}
