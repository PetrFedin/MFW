import { EVENT_CODES } from "../events/catalog.js";

export const demoUser = {
  id: "demo-user",
  name: "Alex Morgan",
  role: "Fashion industry guest",
};

export const demoRegistrations = [
  { id:"reg-mfw", userId:demoUser.id, eventCode:EVENT_CODES.MOSCOW_FASHION_WEEK, registrationType:"buyer", status:"approved" },
  { id:"reg-bfs", userId:demoUser.id, eventCode:EVENT_CODES.BRICS_FASHION_SUMMIT, registrationType:"delegate", status:"approved" },
];

export const demoProgramme = [
  { id:"mfw-opening", eventCode:EVENT_CODES.MOSCOW_FASHION_WEEK, type:"show", title:"Opening runway", startsAt:"2026-09-28T10:30:00+03:00", venue:"Moscow", tag:"SHOW" },
  { id:"bfs-session-1", eventCode:EVENT_CODES.BRICS_FASHION_SUMMIT, type:"business_session", title:"Fashion economies: new centres of growth", startsAt:"2026-09-28T11:30:00+03:00", venue:"Zaryadye · Hall 1", tag:"BUSINESS" },
  { id:"mfw-show-2", eventCode:EVENT_CODES.MOSCOW_FASHION_WEEK, type:"show", title:"New names · Moscow", startsAt:"2026-09-28T13:00:00+03:00", venue:"Moscow", tag:"SHOW" },
  { id:"bfs-session-2", eventCode:EVENT_CODES.BRICS_FASHION_SUMMIT, type:"business_session", title:"Technology, retail and cross-border fashion", startsAt:"2026-09-28T14:30:00+03:00", venue:"Zaryadye · Hall 2", tag:"SESSION" },
];

export const demoStats = {
  mfw: { registrations:"12.4K", programme:"86", partners:"24", live:"18" },
  bfs: { registrations:"6.8K", programme:"42", delegations:"31", meetings:"186" },
};
