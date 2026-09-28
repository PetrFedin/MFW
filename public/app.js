const state={data:null,eventCode:"mfw-2026-09",view:"today"};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const fmt=iso=>new Intl.DateTimeFormat("en",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Europe/Moscow"}).format(new Date(iso));
const event=()=>state.data.events.find(e=>e.code===state.eventCode);
const reg=()=>state.data.registrations.find(r=>r.eventCode===state.eventCode);
const theme=()=>state.eventCode.startsWith("mfw")?"mfw":"bfs";
const eventName=()=>theme()==="mfw"?"MOSCOW FASHION WEEK":"BRICS+ FASHION SUMMIT";

function hero(){
 document.body.dataset.theme=theme();
 const mfw=theme()==="mfw";
 $("#hero").innerHTML=`<div class="eyebrow">${mfw?"26 SEP — 01 OCT · MOSCOW":"28 — 30 SEP · ZARYADYE, MOSCOW"}</div>
 <h1>${mfw?"Fashion<br>in motion.":"Fashion<br>without borders."}</h1>
 <p>${mfw?"Runway, designers, buyers and the city — one live fashion week experience.":"Business programme, international delegations and B2B connections — one summit experience."}</p>
 <div class="status"><span class="dot"></span>${reg()?.status==="approved"?"REGISTRATION APPROVED":"REGISTRATION REQUIRED"} · ${reg()?.registrationType?.toUpperCase()||""}</div>`;
 $$(".switch").forEach(b=>b.classList.toggle("active",b.dataset.event===state.eventCode));
}
function cards(items){
 return `<div class="grid">${items.map(x=>`<article class="card"><span class="badge">${x.tag||x.type}</span><div class="time">${fmt(x.startsAt)} · MSK</div><h3>${x.title}</h3><div class="meta">${x.venue||"Moscow"} · ${eventName()}</div></article>`).join("")}</div>`;
}
async function today(){
 const slug=event().slug; const r=await fetch(`/api/events/${slug}/today`); const d=await r.json();
 $("#content").innerHTML=`<div class="section-head"><h2>Today</h2><span>${d.items.length} LIVE MOMENTS</span></div>${cards(d.items)}
 <div class="section-head"><h2>Across both events</h2><span>COMBINED TODAY</span></div>${cards(state.data.combinedToday)}`;
}
async function programme(){
 const own=state.data.combinedToday.filter(x=>x.eventCode===state.eventCode);
 $("#content").innerHTML=`<div class="section-head"><h2>${theme()==="mfw"?"Programme":"Business programme"}</h2><span>28 SEP</span></div>${cards(own)}
 ${theme()==="bfs"?'<div class="section-head"><h2>B2B</h2><span>DELEGATE MODE</span></div><div class="card"><div class="time">NETWORKING</div><h3>Request a meeting</h3><div class="meta">Discover delegates · choose an available slot · meet at the summit</div></div>':""}`;
}
async function pass(){
 const p=state.data.passes.find(x=>x.eventCode===state.eventCode); const r=await fetch(`/api/passes/${p.id}/qr`); const d=await r.json();
 $("#content").innerHTML=`<div class="section-head"><h2>My pass</h2><span>EVENT-BOUND QR</span></div><div class="pass"><div class="event">${eventName()}</div><h2>${p.passType}<br>PASS</h2><div class="meta">${state.data.user.name}</div><div class="qr"><img src="${d.qr}" alt="QR pass"></div><div class="pass-foot"><span>VALID FOR THIS EVENT ONLY</span><span>LIVE</span></div></div>`;
}
async function admin(){
 const s=theme()==="mfw"?state.data.stats.mfw:state.data.stats.bfs;
 const labels=theme()==="mfw"?["Registrations","Programme items","Partners","Live assets"]:["Registrations","Sessions","Delegations","B2B meetings"];
 $("#content").innerHTML=`<div class="section-head"><h2>Live control</h2><span>${eventName()}</span></div><div class="stats">${Object.values(s).map((v,i)=>`<div class="stat"><strong>${v}</strong><span>${labels[i]}</span></div>`).join("")}</div>
 <div class="section-head"><h2>Operations</h2><span>EVENT SCOPE LOCKED</span></div><div class="grid"><div class="card"><div class="time">ACCESS</div><h3>QR gate control</h3><div class="meta">Credentials and scans are isolated by event.</div></div><div class="card"><div class="time">PROGRAMME</div><h3>Session authority</h3><div class="meta">Changes publish only inside the selected event.</div></div></div>`;
}
function profile(){
 const m=state.data.registrations.find(x=>x.eventCode==="mfw-2026-09"),b=state.data.registrations.find(x=>x.eventCode==="brics-fashion-summit-2026");
 $("#content").innerHTML=`<div class="section-head"><h2>One account. Two events.</h2><span>GLOBAL IDENTITY</span></div><div class="profile"><div class="profile-row"><b>${state.data.user.name}</b><span>PROFILE</span></div><div class="profile-row"><b>MFW · ${m.registrationType}</b><span>${m.status}</span></div><div class="profile-row"><b>BFS · ${b.registrationType}</b><span>${b.status}</span></div><p class="meta">Your profile is shared. Registration, role, permissions and QR pass are approved independently for each event.</p></div>`;
}
async function render(){hero();$$("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));if(state.view==="today")await today();else if(state.view==="programme")await programme();else if(state.view==="pass")await pass();else if(state.view==="admin")await admin();else profile();}
$$("[data-event]").forEach(b=>b.onclick=()=>{state.eventCode=b.dataset.event;render()});
$$("[data-view]").forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
$("#adminBtn").onclick=()=>{state.view="admin";render()};
state.data=await fetch("/api/bootstrap").then(r=>r.json());render();