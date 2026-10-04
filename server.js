import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// 1) Service Worker: Servir explícitamente con headers agresivos
app.get('/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.resolve(__dirname, 'service-worker.js'));
});

// 2) Limpieza de rutas viejas
app.get('/farmacia-sw.js', (req, res) => res.status(404).send('Not Found'));
app.get('/sw.js', (req, res) => res.status(410).send('Gone'));

// 3) Debug Info (Opcional)
app.get('/__debug', (req, res) => {
  const swPath = path.resolve(__dirname, 'service-worker.js');
  const safeStat = (p) => {
    try {
      const st = fs.statSync(p);
      return { exists: true, size: st.size, mtime: st.mtime.toISOString() };
    } catch (e) {
      return { exists: false, error: e.message };
    }
  };
  res.json({
    cwd: process.cwd(),
    files: { 'service-worker.js': safeStat(swPath) }
  });
});

// 4) Archivos Estáticos
const distPath = path.resolve(__dirname, 'dist');
const publicPath = fs.existsSync(distPath) ? distPath : __dirname;

app.use(express.static(publicPath, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  }
}));

// 5) SPA Fallback
app.use((req, res) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.resolve(publicPath, 'index.html'));
  } else {
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  // Server started
});