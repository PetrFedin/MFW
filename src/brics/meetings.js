import { EVENT_CODES } from "../events/catalog.js";

const BFS = EVENT_CODES.BRICS_FASHION_SUMMIT;

export const MEETING_STATUS = Object.freeze({
  REQUESTED: "requested",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
});

export function requestB2BMeeting({
  id, requesterUserId, recipientUserId, startsAt, endsAt, location = null, note = null,
}) {
  if (!id || !requesterUserId || !recipientUserId || !startsAt || !endsAt) {
    throw new Error("B2B meeting requires id, participants, startsAt and endsAt");
  }
  if (requesterUserId === recipientUserId) throw new Error("Cannot request meeting with self");
  if (new Date(endsAt) <= new Date(startsAt)) throw new Error("Meeting end must be after start");
  return {
    id,
    eventCode: BFS,
    requesterUserId,
    recipientUserId,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    location,
    note,
    status: MEETING_STATUS.REQUESTED,
  };
}

export function acceptB2BMeeting(meeting, actorUserId) {
  if (meeting.eventCode !== BFS) throw new Error("B2B meetings are BFS-scoped");
  if (actorUserId !== meeting.recipientUserId) throw new Error("Only recipient can accept");
  if (meeting.status !== MEETING_STATUS.REQUESTED) throw new Error("Meeting is not pending");
  return { ...meeting, status: MEETING_STATUS.ACCEPTED };
}

export function hasMeetingConflict(meetings, candidate) {
  const start = new Date(candidate.startsAt);
  const end = new Date(candidate.endsAt);
  return meetings.some((meeting) => {
    if (meeting.eventCode !== BFS) return false;
    if (![MEETING_STATUS.REQUESTED, MEETING_STATUS.ACCEPTED].includes(meeting.status)) return false;
    const sharesParticipant = [
      meeting.requesterUserId, meeting.recipientUserId,
    ].some((id) => id === candidate.requesterUserId || id === candidate.recipientUserId);
    if (!sharesParticipant) return false;
    return start < new Date(meeting.endsAt) && end > new Date(meeting.startsAt);
  });
}
