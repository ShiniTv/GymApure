import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import apiRouter from './src/api/index.ts';
import { initDb, pool } from './src/db/index.ts';
import { env } from './src/config/env.ts';
import { errorHandler, notFoundHandler } from './src/api/middleware/errorHandler.ts';
import { startExpiryCron } from './src/jobs/expiryCron.ts';
import { logger } from './src/lib/logger.ts';
import { requestMetricsMiddleware } from './src/api/middleware/requestMetrics.ts';
import { corsMiddleware } from './src/api/middleware/cors.ts';
import { configureEmail } from './src/lib/email.ts';
import { apiVersionHeader } from './src/api/middleware/apiVersion.ts';
import { initWebSocket } from './src/lib/wsServer.ts';
import { configurePush } from './src/lib/pushNotifications.ts';

// Preferir IPv4 para SMTP y otras conexiones salientes (Gmail en Windows)
dns.setDefaultResultOrder('ipv4first');

async function initSentry() {
  if (!env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    integrations: [Sentry.expressIntegration()],
    tracesSampleRate: 0.1,
  });
  return Sentry;
}

async function startServer() {
  await initDb();

  const app = express();
  const PORT = env.PORT;
  const sentry = await initSentry();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  configureEmail({
    host: env.SMTP_HOST ?? '',
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    user: env.SMTP_USER ?? '',
    pass: (env.SMTP_PASS ?? '').replace(/\s/g, ''),
    from: env.SMTP_FROM ?? '',
  });

  if (env.NODE_ENV === 'production' && !(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)) {
    logger.warn(
      'SMTP no configurado: correos del sistema (bienvenida, recuperar contraseña, pagos) no se enviarán'
    );
  }

  configurePush({
    publicKey: env.VAPID_PUBLIC_KEY ?? '',
    privateKey: env.VAPID_PRIVATE_KEY ?? '',
    subject: env.VAPID_SUBJECT ?? 'mailto:gymapure@localhost',
  });

  app.use(
    helmet({
      contentSecurityPolicy:
        env.NODE_ENV === 'production'
          ? {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
                mediaSrc: ["'self'", 'blob:', 'https://*.supabase.co'],
                connectSrc: ["'self'", 'https://*.supabase.co'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                frameSrc: ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
                baseUri: ["'self'"],
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(), geolocation=(), interest-cohort=()'
    );
    next();
  });

  app.use(compression({ threshold: 1024, level: 6 }));

  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api', requestMetricsMiddleware);
  app.use('/api', apiVersionHeader);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  for (const dir of ['proofs', 'videos', 'avatars']) {
    const dirPath = path.join(uploadsDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  if (env.NODE_ENV !== 'production') {
    app.use(
      '/uploads',
      express.static(path.join(process.cwd(), 'uploads'), {
        maxAge: '1d',
        immutable: false,
        setHeaders(res, filePath) {
          const ext = path.extname(filePath).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
            res.setHeader('Cache-Control', 'private, max-age=86400');
          }
        },
      })
    );
  }

  app.use('/api', apiRouter);
  app.use('/api/v1', apiVersionHeader, apiRouter);

  if (sentry) {
    sentry.setupExpressErrorHandler(app);
  }

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

  const server = app.listen(PORT, '0.0.0.0', () => {
    if (env.NODE_ENV !== 'production') {
      console.log(`\n  GymApure — http://localhost:${PORT}\n`);
    } else {
      logger.info('Server started', { port: PORT, nodeEnv: env.NODE_ENV });
    }
    initWebSocket(server);
    startExpiryCron();
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await pool.end();
      logger.info('Server shut down complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Failed to start server', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
