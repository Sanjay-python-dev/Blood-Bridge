import 'dotenv/config';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import cors from 'cors';
import apiRouter from './server/routes/api.js';

function bloodBridgeApiPlugin() {
  const apiApp = express();
  apiApp.use(cors());
  apiApp.use(express.json());
  apiApp.use('/api', apiRouter);
  apiApp.get('/email-action', (req, res) => {
    const token = req.query.token || '';
    const action = req.query.action || '';
    res.redirect(307, `/api/email-action?token=${encodeURIComponent(token)}${action ? `&action=${encodeURIComponent(action)}` : ''}`);
  });
  apiApp.get('/email-approval', (req, res) => {
    const token = req.query.token || '';
    const action = req.query.action || '';
    res.redirect(307, `/api/email-action?token=${encodeURIComponent(token)}${action ? `&action=${encodeURIComponent(action)}` : ''}`);
  });

  return {
    name: 'bloodbridge-api-server',
    configureServer(server) {
      server.middlewares.use(apiApp);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), bloodBridgeApiPlugin()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
});
