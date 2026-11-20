const API_BASE = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'devpulse_intelligence_v1';

const SEED_ITEMS = [
  {
    id: 'repo-101',
    repoName: 'torstaq/billing-ledger-service',
    language: 'TypeScript',
    prCount: 18,
    openIssues: 3,
    deployFreq: 'Daily',
    riskScore: 42,
    riskLevel: 'Moderate',
    healthScore: 70,
    riskSignals: ['Touches sensitive auth, schema, or security boundary'],
    aiSummary: 'Repository torstaq/billing-ledger-service (TypeScript) has balanced velocity with moderate change risk (42/100). Verify edge-case tests and monitor latency after deployment.',
    recommendations: [
      'Keep PR scope under ~250 changed lines and enforce CI checks on every branch.',
      'Audit 3 open issues to separate quick wins from architectural blockers.',
      'Maintain daily release rhythm for torstaq/billing-ledger-service with structured changelog notes.',
    ],
    owner: 'Sasidhar',
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
];

function readLocal() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return JSON.parse(JSON.stringify(SEED_ITEMS));
}
function writeLocal(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function subscribeRealtimeReports(onUpdate) {
  try {
    const es = new EventSource(`${API_BASE}/api/stream`);
    es.onmessage = (e) => { const d = JSON.parse(e.data); if (Array.isArray(d.items)) { writeLocal(d.items); onUpdate(d.items, true); } };
    es.onerror = () => {};
    return () => es.close();
  } catch { return () => {}; }
}

export async function fetchReportsHybrid() {
  try { const r = await fetch(`${API_BASE}/api/reports`); if (r.ok) { const d = await r.json(); writeLocal(d.items); return { items: d.items, backendConnected: true }; } } catch {}
  return { items: readLocal(), backendConnected: false };
}

export async function resetReportsHybrid() {
  try { const r = await fetch(`${API_BASE}/api/reports/reset`, { method: 'POST' }); if (r.ok) { const d = await r.json(); writeLocal(d.items); return { items: d.items, backendConnected: true }; } } catch {}
  const fresh = JSON.parse(JSON.stringify(SEED_ITEMS)); writeLocal(fresh); return { items: fresh, backendConnected: false };
}

export async function createReportHybrid(payload) {
  try { const r = await fetch(`${API_BASE}/api/reports`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (r.ok) { const d = await r.json(); return { item: d.item, backendConnected: true }; } } catch {}
  const list = readLocal();
  const item = {
    id: `repo-${Date.now()}`,
    repoName: payload.repoName || 'torstaq/service',
    language: payload.language || 'TypeScript',
    prCount: Number(payload.prCount) || 10,
    openIssues: Number(payload.openIssues) || 2,
    deployFreq: payload.deployFreq || 'Daily',
    riskScore: 34,
    riskLevel: 'Healthy',
    healthScore: 76,
    riskSignals: ['Standard commit hygiene and normal PR throughput'],
    aiSummary: `Repository ${payload.repoName || 'torstaq/service'} (${payload.language || 'TypeScript'}) is operating in a healthy release window (34/100).`,
    recommendations: ['Keep PR scope small and verify CI status before merging.'],
    owner: payload.owner || 'Sasidhar',
    updatedAt: new Date().toISOString(),
  };
  list.unshift(item); writeLocal(list); return { item, backendConnected: false };
}

export async function deleteReportHybrid(id) {
  try { const r = await fetch(`${API_BASE}/api/reports/${id}`, { method: 'DELETE' }); if (r.ok) { const d = await r.json(); return { items: d.items, backendConnected: true }; } } catch {}
  const list = readLocal().filter((x) => x.id !== id); writeLocal(list); return { items: list, backendConnected: false };
}
