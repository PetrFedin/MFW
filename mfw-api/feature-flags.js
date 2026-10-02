const crypto = require('crypto');

const FORBIDDEN_KEY_PARTS = [
  'qr','checkin','check_in','credential','pass_validation','revocation',
  'consent','access_control','authorization','authz','eligibility',
  'payment','financial_truth','attribution_truth','security_invariant'
];

const FEATURE_DEFINITIONS = Object.freeze({
  programme_production_preview: Object.freeze({
    defaultValue: false,
    envKey: 'MFW_FLAG_PROGRAMME_PRODUCTION_PREVIEW',
    rolloutEnvKey: 'MFW_FLAG_PROGRAMME_PRODUCTION_PREVIEW_ROLLOUT',
    eventBrands: ['mfw','bfs'],
    roles: ['Organizer','Staff']
  }),
  venue_map_preview: Object.freeze({
    defaultValue: false,
    envKey: 'MFW_FLAG_VENUE_MAP_PREVIEW',
    rolloutEnvKey: 'MFW_FLAG_VENUE_MAP_PREVIEW_ROLLOUT',
    eventBrands: ['mfw','bfs'],
    roles: null
  }),
  discovery_search_preview: Object.freeze({
    defaultValue: false,
    envKey: 'MFW_FLAG_DISCOVERY_SEARCH_PREVIEW',
    rolloutEnvKey: 'MFW_FLAG_DISCOVERY_SEARCH_PREVIEW_ROLLOUT',
    eventBrands: ['mfw','bfs'],
    roles: null
  }),
  survey_prompt_preview: Object.freeze({
    defaultValue: false,
    envKey: 'MFW_FLAG_SURVEY_PROMPT_PREVIEW',
    rolloutEnvKey: 'MFW_FLAG_SURVEY_PROMPT_PREVIEW_ROLLOUT',
    eventBrands: ['mfw','bfs'],
    roles: null
  }),
  replay_search_preview: Object.freeze({
    defaultValue: false,
    envKey: 'MFW_FLAG_REPLAY_SEARCH_PREVIEW',
    rolloutEnvKey: 'MFW_FLAG_REPLAY_SEARCH_PREVIEW_ROLLOUT',
    eventBrands: ['mfw','bfs'],
    roles: null
  })
});

function assertSafeDefinitions(definitions) {
  for (const key of Object.keys(definitions || {})) {
    const normalized = String(key).toLowerCase();
    for (const forbidden of FORBIDDEN_KEY_PARTS) {
      if (normalized.includes(forbidden)) {
        throw new Error('forbidden_feature_flag_key:' + key);
      }
    }
  }
  return true;
}

assertSafeDefinitions(FEATURE_DEFINITIONS);

function parseBoolean(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).trim().toLowerCase();
  if (['1','true','on','yes','enabled'].includes(normalized)) return true;
  if (['0','false','off','no','disabled'].includes(normalized)) return false;
  return null;
}

function parseRollout(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

function bucket(flagKey, targetingKey) {
  const digest = crypto.createHash('sha256')
    .update(String(flagKey) + ':' + String(targetingKey || 'anonymous'))
    .digest();
  return digest.readUInt32BE(0) % 10000 / 100;
}

class FeatureEvaluator {
  constructor(options = {}) {
    this.env = options.env || process.env;
    this.provider = options.provider || null;
    this.definitions = options.definitions || FEATURE_DEFINITIONS;
    assertSafeDefinitions(this.definitions);
  }

  fallback(flagKey, context = {}) {
    const def = this.definitions[flagKey];
    if (!def) return { key: flagKey, value: false, reason: 'FLAG_NOT_FOUND', source: 'fallback' };

    const eventBrand = String(context.eventBrand || 'mfw').toLowerCase();
    const role = String(context.role || 'Visitor');

    if (Array.isArray(def.eventBrands) && !def.eventBrands.includes(eventBrand)) {
      return { key: flagKey, value: false, reason: 'EVENT_SCOPE_MISS', source: 'fallback' };
    }
    if (Array.isArray(def.roles) && !def.roles.includes(role)) {
      return { key: flagKey, value: false, reason: 'ROLE_SCOPE_MISS', source: 'fallback' };
    }

    const envOverride = parseBoolean(this.env[def.envKey]);
    if (envOverride !== null) {
      return { key: flagKey, value: envOverride, reason: 'ENV_OVERRIDE', source: 'fallback' };
    }

    const rollout = parseRollout(this.env[def.rolloutEnvKey]);
    if (rollout !== null) {
      const value = bucket(flagKey, context.targetingKey || context.userId || 'anonymous') < rollout;
      return { key: flagKey, value, reason: 'DETERMINISTIC_ROLLOUT', source: 'fallback', rollout };
    }

    return { key: flagKey, value: !!def.defaultValue, reason: 'STATIC_DEFAULT', source: 'fallback' };
  }

  async boolean(flagKey, context = {}) {
    const fallback = this.fallback(flagKey, context);
    if (!this.definitions[flagKey]) return fallback;

    const client = this.provider;
    if (!client || typeof client.getBooleanValue !== 'function') return fallback;

    try {
      const value = await client.getBooleanValue(flagKey, fallback.value, context);
      return { ...fallback, value: !!value, reason: 'PROVIDER', source: 'provider' };
    } catch (err) {
      return {
        ...fallback,
        reason: 'PROVIDER_ERROR_FALLBACK',
        source: 'fallback',
        providerError: String(err && err.message || err)
      };
    }
  }

  async snapshot(context = {}) {
    const entries = await Promise.all(
      Object.keys(this.definitions).map(async (key) => [key, await this.boolean(key, context)])
    );
    return Object.fromEntries(entries);
  }
}

module.exports = {
  FEATURE_DEFINITIONS,
  FORBIDDEN_KEY_PARTS,
  FeatureEvaluator,
  assertSafeDefinitions,
  bucket,
  parseBoolean,
  parseRollout
};
