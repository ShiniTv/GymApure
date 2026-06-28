import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import apiRouter from './src/api/index.ts';
import { initDb } from './src/db/index.ts';
import { env } from './src/config/env.ts';
import { errorHandler, notFoundHandler } from './src/api/middleware/errorHandler.ts';
import { startExpiryCron } from './src/jobs/expiryCron.ts';
import { logger } from './src/lib/logger.ts';
import { requestMetricsMiddleware } from './src/api/middleware/requestMetrics.ts';

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
  app.use(compression());

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', requestMetricsMiddleware);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  fs.mkdirSync(path.join(uploadsDir, 'proofs'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'videos'), { recursive: true });
  fs.mkdirSync(path.join(uploadsDir, 'avatars'), { recursive: true });

  app.use('/api', apiRouter);

  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      logLevel: 'warn',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    if (env.NODE_ENV !== 'production') {
      console.log(`\n  GymApure — http://localhost:${PORT}\n`);
    } else {
      logger.info('Server started', { port: PORT, nodeEnv: env.NODE_ENV });
    }
    startExpiryCron();
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
