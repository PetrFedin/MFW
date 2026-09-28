import { listEvents } from "../events/catalog.js";
import { getEventExperience } from "../events/experience.js";
import { eventRegistrationState } from "../registration/registration.js";

export function buildEventSwitcher({ userId, registrations = [], activeEventCode = null }) {
  return listEvents().map((event) => {
    const experience = getEventExperience(event.code);
    const registration = eventRegistrationState(
      registrations,
      userId,
      { eventCode: event.code },
    );

    return {
      eventCode: event.code,
      slug: event.slug,
      shortName: experience.shortName,
      name: experience.productName,
      visualMode: experience.visualMode,
      active: activeEventCode === event.code,
      registrationStatus: registration.status,
      href: `/events/${event.slug}`,
    };
  });
}

export function switchEvent({ eventCode, currentPath = "/" }) {
  const target = listEvents().find((event) => event.code === eventCode);
  if (!target) throw new Error("Unknown target event");

  const leaf = currentPath
    .replace(/^\/events\/[^/]+/, "")
    .replace(/^\/+/, "");

  const safeLeaf = leaf || "today";
  return `/events/${target.slug}/${safeLeaf}`;
}
