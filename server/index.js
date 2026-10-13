import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

export const app = express();

app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRouter);

// Direct email action routes
app.get('/email-action', (req, res) => {
  const token = req.query.token || '';
  const action = req.query.action || '';
  res.redirect(307, `/api/email-action?token=${encodeURIComponent(token)}${action ? `&action=${encodeURIComponent(action)}` : ''}`);
});

app.get('/email-approval', (req, res) => {
  const token = req.query.token || '';
  const action = req.query.action || '';
  res.redirect(307, `/api/email-action?token=${encodeURIComponent(token)}${action ? `&action=${encodeURIComponent(action)}` : ''}`);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'BloodBridge Hospital Service', timestamp: new Date().toISOString() });
});

// Serve frontend build in production / standalone mode if dist/ exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/email-')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

export default app;

// Standalone server mode
if (process.env.NODE_ENV !== 'test' && !process.env.VITE_EMBEDDED) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`BloodBridge Backend API Server running on port ${PORT}`);
  });
}
