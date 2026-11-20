import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'audits.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ audits: [] }, null, 2));
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { audits: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function saveAuditRecord(record) {
  const db = readDB();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName: record.meta.fullName,
    overallScore: record.scores.overall,
    scores: record.scores,
    stars: record.meta.stars,
    forks: record.meta.forks,
    openIssues: record.meta.openIssues,
    primaryLang: Object.keys(record.languages)[0] || 'Multi',
    scannedAt: record.scannedAt,
  };
  db.audits = [entry, ...db.audits].slice(0, 100);
  writeDB(db);
  return entry;
}

export function getAllAudits() {
  return readDB().audits;
}

export function clearAudits() {
  writeDB({ audits: [] });
}
