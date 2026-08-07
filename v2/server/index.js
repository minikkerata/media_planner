import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getDbPath } from './core/database.js';

import explorerRouter from './routes/explorer.js';
import fileOpsRouter from './routes/file_ops.js';
import settingsRouter from './routes/settings.js';
import aiRouter from './routes/ai.js';
import mediaRouter from './routes/media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const parentDir = path.resolve(__dirname, '..');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoints
const healthHandler = (req, res) => {
  res.json({
    status: 'ok',
    service: 'Media Planner Node API',
    version: '3.0.0-node',
    db_path: getDbPath()
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Register API Routers
app.use('/api', explorerRouter);
app.use('/api', fileOpsRouter);
app.use('/api', settingsRouter);
app.use('/api', aiRouter);
app.use('/api', mediaRouter);

// Serve static frontend files if production dist exists
const distDir = path.join(parentDir, 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

let port = 8085;
const configPath = path.join(parentDir, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (configData.backend_port) {
      port = configData.backend_port;
    }
  } catch (err) {
    console.warn('Could not read config.json, using default port 8085', err.message);
  }
}

// Initialize database
initDb();

app.listen(port, '127.0.0.1', () => {
  console.log(`🚀 Media Planner Node.js Server listening on http://127.0.0.1:${port}`);
});
