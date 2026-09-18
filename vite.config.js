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
});
