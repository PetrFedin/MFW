import { requireEventContext } from "../events/context.js";

export function createEventAuthority({ memberships = [], entitlements = [] } = {}) {
  return {
    rolesFor(userId, input) {
      const event = requireEventContext(input);
      return memberships
        .filter((m) => m.userId === userId && m.eventCode === event.code && m.status !== "revoked")
        .map((m) => m.roleCode);
    },

    hasRole(userId, roleCode, input) {
      return this.rolesFor(userId, input).includes(roleCode);
    },

    hasEntitlement(userId, entitlementCode, input, now = new Date()) {
      const event = requireEventContext(input);
      return entitlements.some((e) => {
        if (e.userId !== userId || e.eventCode !== event.code) return false;
        if (e.entitlementCode !== entitlementCode || e.revokedAt) return false;
        if (e.validFrom && now < new Date(e.validFrom)) return false;
        if (e.validUntil && now > new Date(e.validUntil)) return false;
        return true;
      });
    },
  };
}
