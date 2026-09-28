import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

import { listEvents } from "./src/events/catalog.js";
import { buildEventSwitcher } from "./src/navigation/event-switcher.js";
import { buildCombinedSchedule } from "./src/schedule/combined.js";
import { demoProgramme, demoRegistrations, demoStats, demoUser } from "./src/demo/data.js";
import { issueCredential, myPasses } from "./src/credentials/authority.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);
const secret = process.env.CREDENTIAL_SECRET || "demo-only-change-me";

const credentials = [
  issueCredential({
    id:"pass-mfw", userId:demoUser.id, eventCode:"mfw-2026-09", passType:"BUYER",
    entitlements:["EVENT","SHOWS","SHOWROOM"], validFrom:"2026-09-26T00:00:00+03:00",
    validUntil:"2026-10-02T00:00:00+03:00", secret,
  }),
  issueCredential({
    id:"pass-bfs", userId:demoUser.id, eventCode:"brics-fashion-summit-2026", passType:"DELEGATE",
    entitlements:["EVENT","BUSINESS_PROGRAMME","EXHIBITION","B2B"], validFrom:"2026-09-28T00:00:00+03:00",
    validUntil:"2026-10-01T00:00:00+03:00", secret,
  }),
];

function json(res, status, data) {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(data));
}

async function serveStatic(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\//,"");
  const safe = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/,"");
  const file = path.join(publicDir, safe);
  if (!file.startsWith(publicDir)) return false;
  try {
    const body = await fs.readFile(file);
    const ext = path.extname(file);
    const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
    res.writeHead(200,{"content-type":types[ext]||"application/octet-stream"});
    res.end(body); return true;
  } catch { return false; }
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://localhost");
  if(url.pathname==="/health") return json(res,200,{ok:true,service:"mfw-platform",mode:process.env.DATABASE_URL?"postgres-ready":"demo"});
  if(url.pathname==="/api/bootstrap") return json(res,200,{
    user:demoUser,
    events:listEvents(),
    switcher:buildEventSwitcher({userId:demoUser.id,registrations:demoRegistrations,activeEventCode:"mfw-2026-09"}),
    registrations:demoRegistrations,
    combinedToday:buildCombinedSchedule(demoProgramme),
    stats:demoStats,
    passes:myPasses(credentials,demoUser.id).map(({token,...pass})=>pass),
  });
  if(url.pathname.startsWith("/api/events/") && url.pathname.endsWith("/today")){
    const slug=url.pathname.split("/")[3];
    const event=listEvents().find(x=>x.slug===slug);
    if(!event) return json(res,404,{error:"event_not_found"});
    return json(res,200,{event,items:buildCombinedSchedule(demoProgramme,{eventCode:event.code})});
  }
  if(url.pathname.startsWith("/api/passes/") && url.pathname.endsWith("/qr")){
    const id=url.pathname.split("/")[3];
    const pass=credentials.find(x=>x.id===id && x.userId===demoUser.id);
    if(!pass) return json(res,404,{error:"pass_not_found"});
    const dataUrl=await QRCode.toDataURL(pass.token,{margin:1,width:512});
    return json(res,200,{id:pass.id,eventCode:pass.eventCode,passType:pass.passType,qr:dataUrl});
  }
  if(url.pathname==="/api/admin/overview") return json(res,200,{stats:demoStats,events:listEvents()});
  if(await serveStatic(req,res)) return;
  if(!url.pathname.startsWith("/api/")){
    try { const body=await fs.readFile(path.join(publicDir,"index.html")); res.writeHead(200,{"content-type":"text/html; charset=utf-8"}); return res.end(body); } catch {}
  }
  json(res,404,{error:"not_found"});
});
server.listen(port,()=>console.log(`MFW Platform listening on :${port}`));
