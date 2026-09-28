import test from "node:test";
import assert from "node:assert/strict";

import { EVENT_CODES } from "../src/events/catalog.js";
import { createProgrammeItem, programmeForEvent } from "../src/programme/authority.js";
import { createDelegation, addDelegate } from "../src/brics/delegations.js";
import {
  MEETING_STATUS,
  requestB2BMeeting,
  acceptB2BMeeting,
  hasMeetingConflict,
} from "../src/brics/meetings.js";

test("programme authority isolates MFW and BFS", () => {
  const mfw = createProgrammeItem({
    id:"p1", eventCode:EVENT_CODES.MOSCOW_FASHION_WEEK,
    localKey:"main-1", type:"show", title:"Show",
    startsAt:"2026-09-28T10:00:00+03:00",
  });
  const bfs = createProgrammeItem({
    id:"p2", eventCode:EVENT_CODES.BRICS_FASHION_SUMMIT,
    localKey:"main-1", type:"business_session", title:"Session",
    startsAt:"2026-09-28T10:00:00+03:00",
  });

  assert.deepEqual(
    programmeForEvent([mfw,bfs], {eventCode:EVENT_CODES.MOSCOW_FASHION_WEEK}).map(x=>x.id),
    ["p1"],
  );
  assert.deepEqual(
    programmeForEvent([mfw,bfs], {eventCode:EVENT_CODES.BRICS_FASHION_SUMMIT}).map(x=>x.id),
    ["p2"],
  );
});

test("BFS delegation membership remains BFS-scoped", () => {
  const delegation=createDelegation({id:"d1",name:"Delegation",countryCode:"ru"});
  const member=addDelegate(delegation,{userId:"u1",title:"Delegate"});
  assert.equal(delegation.eventCode, EVENT_CODES.BRICS_FASHION_SUMMIT);
  assert.equal(member.eventCode, EVENT_CODES.BRICS_FASHION_SUMMIT);
  assert.equal(member.userId,"u1");
});

test("only B2B recipient can accept a requested meeting", () => {
  const meeting=requestB2BMeeting({
    id:"m1", requesterUserId:"u1", recipientUserId:"u2",
    startsAt:"2026-09-29T10:00:00+03:00",
    endsAt:"2026-09-29T10:30:00+03:00",
  });
  assert.throws(()=>acceptB2BMeeting(meeting,"u1"),/Only recipient/);
  assert.equal(acceptB2BMeeting(meeting,"u2").status,MEETING_STATUS.ACCEPTED);
});

test("B2B conflict detection blocks overlapping participant meetings", () => {
  const existing=requestB2BMeeting({
    id:"m1", requesterUserId:"u1", recipientUserId:"u2",
    startsAt:"2026-09-29T10:00:00+03:00",
    endsAt:"2026-09-29T10:30:00+03:00",
  });
  const candidate=requestB2BMeeting({
    id:"m2", requesterUserId:"u3", recipientUserId:"u1",
    startsAt:"2026-09-29T10:15:00+03:00",
    endsAt:"2026-09-29T10:45:00+03:00",
  });
  assert.equal(hasMeetingConflict([existing],candidate),true);
});
