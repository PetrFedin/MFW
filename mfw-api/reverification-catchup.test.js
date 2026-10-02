const assert = require('assert');
const {
  normalizeIntervalMinutes,
  shouldRunReverificationCatchup,
  toTimestamp
} = require('./reverification-catchup');

const now = Date.parse('2026-10-02T09:00:00Z');

assert.strictEqual(normalizeIntervalMinutes(30), 60);
assert.strictEqual(normalizeIntervalMinutes(360), 360);
assert.strictEqual(normalizeIntervalMinutes('bad'), 360);

assert.strictEqual(toTimestamp(null), null);
assert.strictEqual(toTimestamp('bad-date'), null);
assert.strictEqual(toTimestamp('2026-10-02T08:00:00Z'), Date.parse('2026-10-02T08:00:00Z'));

assert.strictEqual(shouldRunReverificationCatchup(null, 360, now), true);
assert.strictEqual(shouldRunReverificationCatchup('bad-date', 360, now), true);
assert.strictEqual(shouldRunReverificationCatchup('2026-10-02T08:30:00Z', 360, now), false);
assert.strictEqual(shouldRunReverificationCatchup('2026-10-02T03:00:00Z', 360, now), true);
assert.strictEqual(shouldRunReverificationCatchup('2026-10-02T03:00:01Z', 360, now), false);

console.log(JSON.stringify({
  event: 'mfw_reverification_catchup_contract',
  status: 'pass'
}));
