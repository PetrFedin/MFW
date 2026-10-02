function normalizeIntervalMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 360;
  return Math.max(60, n);
}

function toTimestamp(value) {
  if (!value) return null;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

function shouldRunReverificationCatchup(lastCompletedAt, intervalMinutes, nowMs = Date.now()) {
  const intervalMs = normalizeIntervalMinutes(intervalMinutes) * 60 * 1000;
  const lastMs = toTimestamp(lastCompletedAt);
  if (lastMs === null) return true;
  return Number(nowMs) - lastMs >= intervalMs;
}

module.exports = {
  normalizeIntervalMinutes,
  shouldRunReverificationCatchup,
  toTimestamp
};
