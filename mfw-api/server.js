const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

const PORT = Number(process.env.PORT || 10000);
const ORIGIN = process.env.MFW_ALLOWED_ORIGIN || 'https://moscow-fashion-week-preview.onrender.com';
const PASS_SECRET = process.env.MFW_PASS_SECRET || 'demo-only-change-before-production';
const VERSION = 'investor-api-v2';

function validateInvestorBuild() {
  const frontend = fs.readFileSync('mfw/app.js','utf8');
  new Function(frontend);
  JSON.parse(fs.readFileSync('mfw/manifest.webmanifest','utf8'));
  for (const required of ['investor-tour','Organizer cockpit','/v1/passes/issue','/v1/meetings']) {
    if (!frontend.includes(required)) throw new Error('missing_investor_hook:' + required);
  }
}

validateInvestorBuild();

const events = [
  { id:'e1', time:'17:00', name:'MFW Opening Runway', type:'show', venue:'Manege Hall 1', status:'LIVE', demo:true },
  { id:'e2', time:'18:00', name:'New Names: Moscow', type:'show', venue:'Manege Hall 2', status:'REGISTRATION', demo:true },
  { id:'e3', time:'19:00', name:'Buyer Perspective', type:'talk', venue:'Lecture Hall', status:'OPEN', demo:true }
];

const brands = [
  { id:'b1', name:'MFW / NEW 01', city:'Moscow', segment:'Emerging Womenswear', demo:true },
  { id:'b2', name:'MFW / STUDIO 02', city:'Saint Petersburg', segment:'Contemporary Unisex', demo:true }
];

const meetings = [];
const analytics = {
  apiStartedAt: new Date().toISOString(),
  passIssued: 0,
  passVerified: 0,
  meetingsCreated: 0,
  eventsTracked: 0,
  byType: Object.create(null)
};

const buckets = new Map();

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':Buffer.byteLength(body),
    'Access-Control-Allow-Origin':ORIGIN,
    'Access-Control-Allow-Headers':'Content-Type, Authorization',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Vary':'Origin',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 100000) reject(new Error('body_too_large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (_) { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

function unbase64url(input) {
  input = input.replace(/-/g,'+').replace(/_/g,'/');
  while (input.length % 4) input += '=';
  return Buffer.from(input,'base64').toString('utf8');
}

function sign(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', PASS_SECRET).update(encoded).digest('base64url');
  return encoded + '.' + sig;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return { ok:false, reason:'malformed' };
  const parts = token.split('.');
  if (parts.length !== 2) return { ok:false, reason:'malformed' };
  const expected = crypto.createHmac('sha256', PASS_SECRET).update(parts[0]).digest('base64url');
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return { ok:false, reason:'bad_signature' };
  let payload;
  try { payload = JSON.parse(unbase64url(parts[0])); }
  catch (_) { return { ok:false, reason:'bad_payload' }; }
  if (payload.exp && Date.now() > payload.exp) return { ok:false, reason:'expired', payload };
  return { ok:true, payload };
}

function rateLimit(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const minute = Math.floor(Date.now()/60000);
  const key = ip + ':' + minute;
  const current = (buckets.get(key) || 0) + 1;
  buckets.set(key, current);
  if (buckets.size > 2000) {
    for (const k of buckets.keys()) if (!k.endsWith(':'+minute)) buckets.delete(k);
  }
  return current <= 120;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (!rateLimit(req)) return json(res, 429, { error:'rate_limited' });

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  try {
    if (req.method === 'GET' && path === '/health') {
      return json(res, 200, {
        status:'ok',
        service:'mfw-api',
        version:VERSION,
        authority:'server',
        persistence:'memory-demo',
        postgres:false,
        frontendSyntaxChecked:true,
        investorHooksChecked:true,
        note:'PostgreSQL is intentionally not shared with another project.'
      });
    }

    if (req.method === 'GET' && path === '/v1/events') {
      return json(res, 200, { data:events, demo:true });
    }

    if (req.method === 'GET' && path === '/v1/brands') {
      return json(res, 200, { data:brands, demo:true });
    }

    if (req.method === 'POST' && path === '/v1/auth/demo') {
      const body = await readBody(req);
      const role = String(body.role || 'Visitor');
      const name = String(body.name || 'Demo User').slice(0,120);
      const userId = 'demo_' + crypto.createHash('sha256').update(name+':'+role).digest('hex').slice(0,12);
      const session = sign({ typ:'session', sub:userId, role, name, iat:Date.now(), exp:Date.now()+6*60*60*1000 });
      return json(res, 200, { user:{ id:userId, name, role, demo:true }, session });
    }

    if (req.method === 'POST' && path === '/v1/passes/issue') {
      const body = await readBody(req);
      const payload = {
        typ:'mfw-pass',
        jti:'pass_' + crypto.createHash('sha256').update(JSON.stringify(body)+Date.now()).digest('hex').slice(0,16),
        sub:String(body.userId || 'demo_user'),
        role:String(body.role || 'Visitor'),
        entitlements:Array.isArray(body.entitlements) ? body.entitlements.slice(0,20) : ['public_programme'],
        issuedAt:Date.now(),
        exp:Date.now()+15*60*1000,
        demo:true
      };
      analytics.passIssued++;
      return json(res, 201, { token:sign(payload), payload });
    }

    if (req.method === 'POST' && path === '/v1/passes/verify') {
      const body = await readBody(req);
      const result = verify(body.token);
      if (result.ok) analytics.passVerified++;
      return json(res, result.ok ? 200 : 401, result);
    }

    if (req.method === 'POST' && path === '/v1/meetings') {
      const body = await readBody(req);
      const meeting = {
        id:'mtg_' + crypto.createHash('sha256').update(JSON.stringify(body)+Date.now()).digest('hex').slice(0,12),
        brandId:String(body.brandId || 'b1'),
        buyerId:String(body.buyerId || 'demo_buyer'),
        slot:String(body.slot || '14:30'),
        status:'confirmed',
        createdAt:new Date().toISOString(),
        demo:true
      };
      meetings.push(meeting);
      analytics.meetingsCreated++;
      return json(res, 201, { data:meeting });
    }

    if (req.method === 'POST' && path === '/v1/analytics/track') {
      const body = await readBody(req);
      const type = String(body.type || 'unknown').slice(0,80);
      analytics.eventsTracked++;
      analytics.byType[type] = (analytics.byType[type] || 0) + 1;
      return json(res, 202, { accepted:true });
    }

    if (req.method === 'GET' && path === '/v1/analytics/overview') {
      return json(res, 200, {
        data:{
          ...analytics,
          activeMeetings:meetings.length,
          demo:true
        }
      });
    }

    return json(res, 404, { error:'not_found' });
  } catch (err) {
    return json(res, 400, { error:err.message || 'bad_request' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ event:'mfw_api_started', port:PORT, version:VERSION }));
});
