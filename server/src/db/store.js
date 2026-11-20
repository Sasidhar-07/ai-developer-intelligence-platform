import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeRepository } from '../services/intelligenceEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'intelligence.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function seedItem(id, repoName, language, commitMessage, prCount, openIssues, deployFreq, owner, hoursAgo) {
  const analysis = analyzeRepository({ repoName, language, commitMessage, prCount, openIssues, deployFreq });
  return { id, ...analysis, owner, updatedAt: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString() };
}

const DEFAULT_DATA = {
  items: [
    seedItem('repo-101', 'torstaq/billing-ledger-service', 'TypeScript', 'Refactor webhook signature verification & idempotency keys', 18, 3, 'Daily', 'Sasidhar', 2),
    seedItem('repo-102', 'torstaq/realtime-sync-gateway', 'Node.js', 'Hotfix SSE heartbeat reconnect under high concurrency', 24, 9, 'Multiple / day', 'Vijaysimha', 5),
    seedItem('repo-103', 'torstaq/ui-design-tokens', 'React', 'Add accessible focus states and token documentation', 9, 2, 'Weekly', 'Sasidhar', 11),
  ],
};

function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
export function resetAndReadItems() { const fresh = JSON.parse(JSON.stringify(DEFAULT_DATA)); writeDB(fresh); return fresh.items; }
function readItems() {
  if (!fs.existsSync(DB_FILE)) return resetAndReadItems();
  try { const p = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); return Array.isArray(p.items) ? p.items : resetAndReadItems(); }
  catch { return resetAndReadItems(); }
}
function saveItems(items) { writeDB({ items }); }
export function listItems() { return readItems(); }

export function createIntelligenceReport(payload) {
  const analysis = analyzeRepository(payload);
  const record = { id: `repo-${Date.now()}`, ...analysis, owner: (payload.owner || 'Sasidhar').trim(), updatedAt: new Date().toISOString() };
  const items = readItems(); items.unshift(record); saveItems(items);
  return record;
}

export function deleteIntelligenceReport(id) {
  const items = readItems();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error('Repository report not found');
  items.splice(idx, 1); saveItems(items);
  return items;
}
