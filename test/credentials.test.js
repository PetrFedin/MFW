import test from "node:test";
import assert from "node:assert/strict";
import { issueCredential, myPasses, verifyCredential } from "../src/credentials/authority.js";

const secret="test-secret";
const mfw=()=>issueCredential({id:"mfw-pass",userId:"u1",eventCode:"mfw-2026-09",passType:"BUYER",entitlements:["SHOWS"],validFrom:"2026-09-26T00:00:00Z",validUntil:"2026-10-02T00:00:00Z",secret});

test("signed credential verifies only inside its own event",()=>{
 const pass=mfw();
 assert.equal(verifyCredential(pass.token,{eventCode:"mfw-2026-09",secret,now:new Date("2026-09-28T12:00:00Z")}).valid,true);
 const wrong=verifyCredential(pass.token,{eventCode:"brics-fashion-summit-2026",secret,now:new Date("2026-09-28T12:00:00Z")});
 assert.equal(wrong.valid,false);
 assert.equal(wrong.reason,"wrong_event");
});

test("tampered QR credential fails signature verification",()=>{
 const pass=mfw();
 const token=pass.token.slice(0,-2)+"xx";
 assert.equal(verifyCredential(token,{eventCode:"mfw-2026-09",secret}).valid,false);
});

test("My Passes can contain separate credentials for same global user",()=>{
 const a=mfw();
 const b=issueCredential({id:"bfs-pass",userId:"u1",eventCode:"brics-fashion-summit-2026",passType:"DELEGATE",entitlements:["B2B"],validFrom:"2026-09-28T00:00:00Z",validUntil:"2026-10-01T00:00:00Z",secret});
 assert.deepEqual(myPasses([a,b],"u1").map(x=>x.id),["bfs-pass","mfw-pass"]);
});
