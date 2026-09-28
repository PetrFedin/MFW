import { EVENT_CODES } from "./catalog.js";

export const PLATFORM_THEME = Object.freeze({
  id: "platform",
  label: "Fashion Events Platform",
  tone: "neutral",
  navigation: ["home", "my-events", "combined-schedule", "notifications", "profile"],
});

export const EVENT_THEMES = Object.freeze({
  [EVENT_CODES.MOSCOW_FASHION_WEEK]: Object.freeze({
    id: "mfw",
    eventCode: EVENT_CODES.MOSCOW_FASHION_WEEK,
    label: { ru: "Московская неделя моды", en: "Moscow Fashion Week" },
    shortLabel: "MFW",
    tone: "editorial-fashion",
    tokens: {
      background: "mfw.background",
      surface: "mfw.surface",
      text: "mfw.text",
      accent: "mfw.accent",
      displayFont: "mfw.display",
    },
    navigation: [
      "today","shows","designers","programme","showroom","market",
      "shorts","my-schedule","pass",
    ],
  }),
  [EVENT_CODES.BRICS_FASHION_SUMMIT]: Object.freeze({
    id: "bfs",
    eventCode: EVENT_CODES.BRICS_FASHION_SUMMIT,
    label: { ru: "Саммит моды БРИКС+", en: "BRICS+ Fashion Summit" },
    shortLabel: "BFS",
    tone: "international-business",
    tokens: {
      background: "bfs.background",
      surface: "bfs.surface",
      text: "bfs.text",
      accent: "bfs.accent",
      displayFont: "bfs.display",
    },
    navigation: [
      "today","business-programme","speakers","delegations","exhibition",
      "b2b-meetings","shorts","my-schedule","pass",
    ],
  }),
});

export function getEventTheme(eventCode) {
  return EVENT_THEMES[eventCode] ?? null;
}
