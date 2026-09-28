import { EVENT_CODES } from "../events/catalog.js";

const BFS = EVENT_CODES.BRICS_FASHION_SUMMIT;

export function createDelegation({ id, name, countryCode, leadUserId = null }) {
  if (!id || !name || !countryCode) throw new Error("Delegation requires id, name and countryCode");
  return {
    id,
    eventCode: BFS,
    name,
    countryCode: countryCode.toUpperCase(),
    leadUserId,
    status: "active",
  };
}

export function addDelegate(delegation, { userId, title = null, organisation = null }) {
  if (delegation.eventCode !== BFS) throw new Error("Delegations are BFS-scoped");
  if (!userId) throw new Error("Delegate userId is required");
  return {
    delegationId: delegation.id,
    eventCode: BFS,
    userId,
    title,
    organisation,
    status: "active",
  };
}
