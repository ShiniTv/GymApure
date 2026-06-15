import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import apiRouter from './src/api/index.ts';
import { initDb } from './src/db/index.ts';
import { env } from './src/config/env.ts';
import { errorHandler, notFoundHandler } from './src/api/middleware/errorHandler.ts';

async function startServer() {
  await initDb();

  const app = express();
  const PORT = env.PORT;

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.mkdirSync(path.join(uploadsDir, 'proofs'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'videos'), { recursive: true });

  app.use('/api', apiRouter);

  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
