const assert = require('assert');
const fs = require('fs');
const path = require('path');

const blueprintPath = path.join(__dirname, '..', 'render.yaml');
const yaml = fs.readFileSync(blueprintPath, 'utf8');

function mustContain(value) {
  assert(yaml.includes(value), 'render.yaml missing contract: ' + value);
}

function mustNotContain(value) {
  assert(!yaml.includes(value), 'render.yaml contains forbidden/obsolete contract: ' + value);
}

mustContain('name: mfw-postgres');
mustContain('plan: free');
mustContain('postgresMajorVersion: "17"');
mustContain('name: mfw-authority');
mustContain('healthCheckPath: /ready');
mustContain('key: MFW_REQUIRE_POSTGRES');
mustContain('key: DATABASE_URL');
mustContain('fromDatabase:');
mustContain('property: connectionString');
mustContain('key: MFW_TELEGRAM_BOT_TOKEN');
mustContain('key: MFW_TELEGRAM_WEBHOOK_SECRET');
mustContain('key: MFW_TELEGRAM_LOGIN_CLIENT_ID');
mustContain('key: MFW_TELEGRAM_LOGIN_CLIENT_SECRET');
mustContain('key: MFW_VK_SERVICE_TOKEN');
mustContain('key: MFW_VK_APP_ID');
mustContain('key: MFW_ADMIN_TOKEN');
mustContain('key: MFW_ES256_SEED');
mustContain('key: MFW_REVERIFY_INTERVAL_MINUTES');
mustContain('key: MFW_REVERIFY_BATCH_SIZE');

mustNotContain('type: cron');
mustNotContain('name: mfw-social-reverification');
mustNotContain('key: TELEGRAM_BOT_TOKEN');
mustNotContain('key: VK_CLIENT_ID');
mustNotContain('key: VK_CLIENT_SECRET');
mustNotContain('key: MFW_JWT_SECRET');

console.log(JSON.stringify({
  event: 'mfw_render_blueprint_contract',
  status: 'pass',
  freeContour: true,
  dedicatedCron: false,
  postgresBindingDeclared: true
}));
