import { listEvents } from "./catalog.js";
import { getEventTheme, PLATFORM_THEME } from "./themes.js";

export function buildEventSwitcher({ activeEventCode = null, registrations = [] } = {}) {
  const registrationByEvent = new Map(
    registrations.map((item) => [item.eventCode, item]),
  );

  return {
    activeScope: activeEventCode ?? "platform",
    platform: PLATFORM_THEME,
    events: listEvents().map((event) => {
      const registration = registrationByEvent.get(event.code) ?? null;
      return {
        code: event.code,
        slug: event.slug,
        name: event.name,
        theme: getEventTheme(event.code),
        registration: registration
          ? {
              status: registration.status,
              registrationType: registration.registrationType,
              applicationId: registration.id,
            }
          : {
              status: "not_registered",
              registrationType: null,
              applicationId: null,
            },
        canEnter: Boolean(registration && ["approved","active"].includes(registration.status)),
      };
    }),
  };
}

export function selectEvent(eventCode, registrations = []) {
  const option = buildEventSwitcher({ activeEventCode: eventCode, registrations })
    .events.find((item) => item.code === eventCode);

  if (!option) throw new Error("Unknown event");
  return {
    scope: eventCode,
    theme: option.theme,
    registration: option.registration,
    accessMode: option.canEnter ? "event" : "registration",
  };
}
