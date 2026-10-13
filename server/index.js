import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';

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

export default app;

// Standalone server mode
if (process.env.NODE_ENV !== 'test' && !process.env.VITE_EMBEDDED) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`BloodBridge Backend API Server running on port ${PORT}`);
  });
}
