import { EVENT_CODES } from "./catalog.js";

export const EVENT_EXPERIENCE = Object.freeze({
  [EVENT_CODES.MOSCOW_FASHION_WEEK]: Object.freeze({
    shell: "mfw",
    shortName: "MFW",
    productName: { ru: "Московская неделя моды", en: "Moscow Fashion Week" },
    visualMode: "editorial-fashion",
    navigation: [
      "today",
      "shows",
      "designers",
      "programme",
      "market",
      "showroom",
      "shorts",
      "my_schedule",
      "pass",
    ],
    homeHero: {
      ru: "Показы, дизайнеры и главные события недели",
      en: "Shows, designers and the key moments of fashion week",
    },
    terminology: {
      session: { ru: "Событие", en: "Event" },
      participant: { ru: "Дизайнер / участник", en: "Designer / participant" },
      saved: { ru: "Моё расписание", en: "My schedule" },
    },
  }),

  [EVENT_CODES.BRICS_FASHION_SUMMIT]: Object.freeze({
    shell: "bfs",
    shortName: "BFS",
    productName: { ru: "Саммит моды БРИКС+", en: "BRICS+ Fashion Summit" },
    visualMode: "international-business-summit",
    navigation: [
      "today",
      "programme",
      "speakers",
      "delegations",
      "exhibition",
      "b2b_meetings",
      "shorts",
      "my_schedule",
      "pass",
    ],
    homeHero: {
      ru: "Деловая программа, спикеры и международные делегации",
      en: "Business programme, speakers and international delegations",
    },
    terminology: {
      session: { ru: "Сессия", en: "Session" },
      participant: { ru: "Спикер / делегат", en: "Speaker / delegate" },
      saved: { ru: "Моя программа", en: "My programme" },
    },
  }),
});

export function getEventExperience(eventCode) {
  return EVENT_EXPERIENCE[eventCode] ?? null;
}
