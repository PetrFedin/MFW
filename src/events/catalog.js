export const EVENT_CODES = Object.freeze({
  MOSCOW_FASHION_WEEK: "mfw-2026-09",
  BRICS_FASHION_SUMMIT: "brics-fashion-summit-2026",
});

export const EVENTS = Object.freeze({
  [EVENT_CODES.MOSCOW_FASHION_WEEK]: Object.freeze({
    code: EVENT_CODES.MOSCOW_FASHION_WEEK,
    slug: "moscow-fashion-week",
    kind: "fashion_week",
    name: { ru: "Московская неделя моды", en: "Moscow Fashion Week" },
    dates: {
      startsOn: "2026-09-26",
      endsOn: "2026-10-01",
      timezone: "Europe/Moscow",
    },
    officialWebsite: "https://moscowfashion.ru/",
    modules: {
      shows: true,
      businessProgram: true,
      speakers: true,
      market: true,
      showroom: true,
      worldFashionShorts: true,
      accreditation: true,
      visitorRegistration: true,
      qrAccess: true,
      streaming: true,
      buyerCommerce: true,
      partnerPlacements: true,
    },
    audienceModes: [
      "visitor","buyer","designer","media","speaker","partner","staff","admin",
    ],
  }),

  [EVENT_CODES.BRICS_FASHION_SUMMIT]: Object.freeze({
    code: EVENT_CODES.BRICS_FASHION_SUMMIT,
    slug: "brics-fashion-summit",
    kind: "industry_summit",
    name: { ru: "Саммит моды БРИКС+", en: "BRICS+ Fashion Summit" },
    dates: {
      startsOn: "2026-09-28",
      endsOn: "2026-09-30",
      timezone: "Europe/Moscow",
    },
    venue: {
      ru: "МКЗ «Зарядье»",
      en: "Concert Hall Zaryadye",
      city: "Moscow",
    },
    officialWebsite: "https://fashionsummit.org/",
    modules: {
      shows: false,
      businessProgram: true,
      speakers: true,
      worldFashionShorts: true,
      accreditation: true,
      visitorRegistration: true,
      qrAccess: true,
      streaming: true,
      partnerPlacements: true,
      exhibition: true,
      internationalDelegations: true,
      b2bMeetings: true,
    },
    audienceModes: [
      "visitor","delegate","speaker","media","partner","staff","admin",
    ],
  }),
});

export function getEvent(code) {
  return EVENTS[code] ?? null;
}

export function listEvents() {
  return Object.values(EVENTS);
}
