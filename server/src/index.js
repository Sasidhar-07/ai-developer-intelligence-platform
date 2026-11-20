import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { listItems, resetAndReadItems, createIntelligenceReport, deleteIntelligenceReport } from './db/store.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;
const clients = new Set();

function broadcastItems(items) {
  const payload = `data: ${JSON.stringify({ items, ts: Date.now() })}\n\n`;
  for (const res of clients) res.write(payload);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: 'AI Developer Intelligence Platform API', clientsConnected: clients.size, timestamp: new Date().toISOString() }));

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  clients.add(res);
  res.write(`data: ${JSON.stringify({ items: listItems(), ts: Date.now() })}\n\n`);
  req.on('close', () => clients.delete(res));
});

app.get('/api/reports', (req, res) => res.json({ items: listItems() }));
app.post('/api/reports/reset', (req, res) => { const items = resetAndReadItems(); broadcastItems(items); res.json({ items }); });
app.post('/api/reports', (req, res) => { try { const item = createIntelligenceReport(req.body); broadcastItems(listItems()); res.status(201).json({ item }); } catch (err) { res.status(400).json({ error: err.message }); } });
app.delete('/api/reports/:id', (req, res) => { try { const items = deleteIntelligenceReport(req.params.id); broadcastItems(items); res.json({ items }); } catch (err) { res.status(400).json({ error: err.message }); } });

app.listen(PORT, () => console.log(`AI Developer Intelligence Backend running on http://localhost:${PORT}`));
