'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {demoIssuerAllowed,configuredAdminTokenAccepted,sessionAllowedForMode,localDemoRequest}=require('./auth-demo-policy');

const secret='mfw_ci_random_secure_admin_credential_0123456789abcdef';
const params=[
 {environment:'unconfigured',p:{},allowed:false},
 {environment:'developer_without_optin',p:{explicitOptIn:false},allowed:false},
 {environment:'local_isolated_preview',p:{explicitOptIn:true,nodeEnv:'development'},allowed:true},
 {environment:'local_node_env_unset',p:{explicitOptIn:true},allowed:false},
 {environment:'postgres_option_enabled',p:{explicitOptIn:true,requirePostgres:true},allowed:false},
 {environment:'db_url_present',p:{explicitOptIn:true,databaseConfigured:true},allowed:false},
 {environment:'production_memory',p:{explicitOptIn:true,nodeEnv:'production'},allowed:false},
 {environment:'production_postgres',p:{explicitOptIn:true,nodeEnv:'production',requirePostgres:true,databaseConfigured:true},allowed:false}
];
for(const {environment,p,allowed}of params)assert.equal(demoIssuerAllowed(p),allowed,environment);
for(const peer of ['127.0.0.1','::1','::ffff:127.0.0.1'])
 assert.equal(localDemoRequest({socket:{remoteAddress:peer}}),true,'loopback peer '+peer);
for(const peer of ['10.0.0.1','192.168.1.10','172.20.0.20','203.0.113.9',''])
 assert.equal(localDemoRequest({socket:{remoteAddress:peer},headers:{'x-forwarded-for':'127.0.0.1'}}),false,
 'remote peer cannot forge localhost '+peer);
assert.equal(localDemoRequest(null),false);
assert.equal(configuredAdminTokenAccepted('mfw-demo-admin','mfw-demo-admin'),false);
assert.equal(configuredAdminTokenAccepted('Organizer','Organizer'),false);
assert.equal(configuredAdminTokenAccepted('short','short'),false);
assert.equal(configuredAdminTokenAccepted(secret,secret),true);
assert.equal(configuredAdminTokenAccepted(secret+'x',secret),false);
assert.equal(configuredAdminTokenAccepted(secret.slice(0,-1)+'x',secret),false);
assert.equal(configuredAdminTokenAccepted(undefined,secret),false);
assert.equal(configuredAdminTokenAccepted(secret,undefined),false);
const selfIssued={typ:'session',sub:'demo_subject',role:'Organizer',demo:true};
assert.equal(sessionAllowedForMode(selfIssued,{}),true,'isolated demo allowed only through separate issuer gate');
assert.equal(sessionAllowedForMode(selfIssued,{requirePostgres:true}),false);
assert.equal(sessionAllowedForMode(selfIssued,{databaseConfigured:true}),false);
assert.equal(sessionAllowedForMode({...selfIssued,demo:false},{databaseConfigured:true}),true,
 'non-demo token still needs real service validation and DB-backed grants');
assert.equal(sessionAllowedForMode(null,{}),false);
assert.equal(sessionAllowedForMode({typ:'event-pass',sub:'demo_subject'},{}),false);

// Guard the actual production adapter against accidental isolation of just
// these pure unit helpers. CI also syntax-checks server-v2.js.
const server=fs.readFileSync(path.join(__dirname,'server-v2.js'),'utf8');
assert(server.includes("if(!demoIssuerAllowed("),'demo route must guard before readBody or issueDemoUser');
assert(server.includes("||!localDemoRequest(req))"),'real server must enforce loopback peer');
assert(server.includes("configuredAdminTokenAccepted(req.headers['x-mfw-admin'],ADMIN_TOKEN)"),
 'admin credential must be checked by configured-secret helper');
assert(server.includes('sessionAllowedForMode(v.payload,'),
 'request-session checks must exclude demo sessions in persistent mode');
assert(!server.includes("req.headers['x-mfw-admin']===ADMIN_TOKEN"),
 'unguarded default token comparison is forbidden');
assert(!server.includes("['Organizer','Staff'].indexOf(p.role)>=0"),
 'client-chosen demo Organizer/Staff must never be administrator');

console.log(JSON.stringify({
 gate:'mfw_demo_auth_production_boundary',status:'pass',
 isolatedExplicitOptIn:true,persistentDemoIssuance:false,
 productionDemoIssuance:false,demoAdminRole:false,
 unconfiguredAdminSecret:false,secretMinBytes:32,
 productionAdmission:false
}));
