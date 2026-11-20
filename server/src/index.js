import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  parseRepoInput,
  analyzeRepositoryService,
  fetchRawFileService,
} from './services/telemetryEngine.js';
import { saveAuditRecord, getAllAudits, clearAudits } from './db/store.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI-Powered Developer Intelligence API',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { repoInput, githubToken } = req.body;
    const { owner, repo } = parseRepoInput(repoInput);
    const intel = await analyzeRepositoryService(owner, repo, githubToken);
    saveAuditRecord(intel);
    res.json(intel);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Analysis failed' });
  }
});

app.post('/api/file', async (req, res) => {
  try {
    const { fullName, filePath, githubToken } = req.body;
    const [owner, repo] = fullName.split('/');
    const content = await fetchRawFileService(owner, repo, filePath, githubToken);
    res.json({ content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/history', (req, res) => {
  res.json({ audits: getAllAudits() });
});

app.delete('/api/history', (req, res) => {
  clearAudits();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Developer Intelligence Backend running on http://localhost:${PORT}`);
});
