const assert = require('assert');
const {
  FeatureEvaluator,
  FEATURE_DEFINITIONS,
  assertSafeDefinitions,
  bucket
} = require('./feature-flags');

(async () => {
  assert.throws(
    () => assertSafeDefinitions({ qr_validation_v2: { defaultValue: false } }),
    /forbidden_feature_flag_key/
  );

  const evaluator = new FeatureEvaluator({ env: {} });
  const defaults = await evaluator.snapshot({ targetingKey: 'u1', role: 'Visitor', eventBrand: 'mfw' });
  for (const key of Object.keys(FEATURE_DEFINITIONS)) {
    assert.strictEqual(defaults[key].value, false, key + ' must default false');
  }

  const staffEvaluator = new FeatureEvaluator({
    env: { MFW_FLAG_PROGRAMME_PRODUCTION_PREVIEW: 'true' }
  });
  const visitor = await staffEvaluator.boolean('programme_production_preview', {
    targetingKey: 'visitor-1', role: 'Visitor', eventBrand: 'bfs'
  });
  assert.strictEqual(visitor.value, false);
  assert.strictEqual(visitor.reason, 'ROLE_SCOPE_MISS');

  const organizer = await staffEvaluator.boolean('programme_production_preview', {
    targetingKey: 'organizer-1', role: 'Organizer', eventBrand: 'bfs'
  });
  assert.strictEqual(organizer.value, true);
  assert.strictEqual(organizer.reason, 'ENV_OVERRIDE');

  const rolloutEvaluator = new FeatureEvaluator({
    env: { MFW_FLAG_VENUE_MAP_PREVIEW_ROLLOUT: '25' }
  });
  const a = await rolloutEvaluator.boolean('venue_map_preview', {
    targetingKey: 'stable-user', role: 'Visitor', eventBrand: 'mfw'
  });
  const b = await rolloutEvaluator.boolean('venue_map_preview', {
    targetingKey: 'stable-user', role: 'Visitor', eventBrand: 'mfw'
  });
  assert.strictEqual(a.value, b.value);
  assert.strictEqual(a.reason, 'DETERMINISTIC_ROLLOUT');
  assert.strictEqual(bucket('venue_map_preview','stable-user'), bucket('venue_map_preview','stable-user'));

  const failingProvider = {
    async getBooleanValue() { throw new Error('provider_down'); }
  };
  const failSafe = new FeatureEvaluator({ env: {}, provider: failingProvider });
  const fallback = await failSafe.boolean('survey_prompt_preview', {
    targetingKey: 'u2', role: 'Visitor', eventBrand: 'mfw'
  });
  assert.strictEqual(fallback.value, false);
  assert.strictEqual(fallback.reason, 'PROVIDER_ERROR_FALLBACK');

  const provider = {
    async getBooleanValue(key, defaultValue) {
      return key === 'discovery_search_preview' ? true : defaultValue;
    }
  };
  const providerEvaluator = new FeatureEvaluator({ env: {}, provider });
  const provided = await providerEvaluator.boolean('discovery_search_preview', {
    targetingKey: 'u3', role: 'Visitor', eventBrand: 'bfs'
  });
  assert.strictEqual(provided.value, true);
  assert.strictEqual(provided.reason, 'PROVIDER');

  console.log(JSON.stringify({
    event: 'mfw_feature_rollout_contract',
    status: 'pass',
    flags: Object.keys(FEATURE_DEFINITIONS)
  }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
