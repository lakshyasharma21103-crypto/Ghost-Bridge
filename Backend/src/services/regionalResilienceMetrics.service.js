const counters = new Map();
const gauges = new Map();
const durations = new Map();
const SAFE_LABELS = new Set(['regionRole', 'healthCategory', 'status', 'outcome', 'lagCategory', 'eligibilityCategory', 'failoverType', 'objectiveCategory', 'backupStatus', 'restoreResult', 'drillResult', 'degradedMode', 'safeReasonCode']);
const MAX_SERIES = 1_000;

function labelKey(labels = {}) {
  return Object.entries(labels).filter(([key]) => SAFE_LABELS.has(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${String(value).slice(0, 64)}`).join(',');
}
function series(name, labels) { return `${String(name).slice(0, 96)}{${labelKey(labels)}}`; }
function set(map, key, value) { if (map.has(key) || map.size < MAX_SERIES) map.set(key, value); }
function increment(name, labels = {}, amount = 1) { const key = series(name, labels); set(counters, key, (counters.get(key) || 0) + Math.max(0, Number(amount) || 0)); }
function gauge(name, labels = {}, value = 0) { set(gauges, series(name, labels), Math.max(0, Number(value) || 0)); }
function observe(name, milliseconds) { const key = String(name).slice(0, 96); const values = durations.get(key) || []; values.push(Math.max(0, Number(milliseconds) || 0)); if (values.length > 1_000) values.shift(); durations.set(key, values); }
function snapshot() { return { counters: Object.fromEntries(counters), gauges: Object.fromEntries(gauges), durations: Object.fromEntries([...durations].map(([key, values]) => [key, { count: values.length, maximum: Math.max(0, ...values), average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }])) }; }
function reset() { counters.clear(); gauges.clear(); durations.clear(); }
module.exports = { gauge, increment, observe, reset, snapshot };
