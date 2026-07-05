import { asyncRouter } from './middleware/asyncRouter.ts';
import { query } from '../db/index.ts';
import { allowPublicRegister } from '../config/env.ts';
import { getRequestMetricsSnapshot } from './middleware/requestMetrics.ts';
import { authenticate, authorize } from './middleware/auth.ts';
import { getExerciseMediaCapabilities } from '../lib/exerciseVideoStorage.ts';
import { isMediaStorageRemote } from '../lib/mediaStorage.ts';
import { isEmailConfigured } from '../lib/email.ts';

const router = asyncRouter();
const startedAt = Date.now();

async function buildMetricsSnapshot() {
  const processUptimeSeconds = Math.floor(process.uptime());
  const rssMb = Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2));
  const heapUsedMb = Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2));
  const requestMetrics = getRequestMetricsSnapshot();

  try {
    const dbStart = process.hrtime.bigint();
    await query('SELECT 1');
    const dbLatencyMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
    return {
      httpStatus: 200,
      payload: {
        status: 'ok' as const,
        uptime_seconds: processUptimeSeconds,
        memory: {
          rss_mb: rssMb,
          heap_used_mb: heapUsedMb,
        },
        request_metrics: requestMetrics,
        db: {
          status: 'up' as const,
          latency_ms: Number(dbLatencyMs.toFixed(2)),
        },
      },
    };
  } catch {
    return {
      httpStatus: 503,
      payload: {
        status: 'degraded' as const,
        uptime_seconds: processUptimeSeconds,
        memory: {
          rss_mb: rssMb,
          heap_used_mb: heapUsedMb,
        },
        request_metrics: requestMetrics,
        db: {
          status: 'down' as const,
          latency_ms: null,
        },
      },
    };
  }
}

function toMetricsCsv(
  snapshot: Awaited<ReturnType<typeof buildMetricsSnapshot>>['payload']
): string {
  const lines: string[] = [];
  lines.push('section,key,value');
  lines.push(`summary,status,${snapshot.status}`);
  lines.push(`summary,uptime_seconds,${snapshot.uptime_seconds}`);
  lines.push(`summary,db_status,${snapshot.db.status}`);
  lines.push(`summary,db_latency_ms,${snapshot.db.latency_ms ?? ''}`);
  lines.push(`summary,avg_response_ms,${snapshot.request_metrics.avgResponseMs}`);
  lines.push(`summary,error_rate_percent,${snapshot.request_metrics.errorRatePercent}`);
  lines.push(`summary,slow_rate_percent,${snapshot.request_metrics.slowRatePercent}`);
  lines.push(`summary,completed_requests,${snapshot.request_metrics.completed}`);
  lines.push(`summary,inflight_requests,${snapshot.request_metrics.inflight}`);
  lines.push(`summary,memory_rss_mb,${snapshot.memory.rss_mb}`);
  lines.push(`summary,memory_heap_used_mb,${snapshot.memory.heap_used_mb}`);

  lines.push('');
  lines.push(
    'top_slow_routes,method,path,avg_ms,max_ms,count,slow_rate_percent,error_rate_percent'
  );
  snapshot.request_metrics.topSlowRoutes.forEach((route) => {
    lines.push(
      `top_slow_routes,${route.method},${route.path},${route.avgDurationMs},${route.maxDurationMs},${route.count},${route.slowRatePercent},${route.errorRatePercent}`
    );
  });

  lines.push('');
  lines.push('timeline,ts,avg_ms,error_rate_percent,slow_rate_percent,completed,inflight');
  snapshot.request_metrics.recentTimeline.forEach((point) => {
    lines.push(
      `timeline,${new Date(point.ts).toISOString()},${point.avgResponseMs},${point.errorRatePercent},${point.slowRatePercent},${point.completed},${point.inflight}`
    );
  });

  return lines.join('\n');
}

router.get('/health', async (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const dbStart = process.hrtime.bigint();

  try {
    await query('SELECT 1');
    const dbLatencyMs = Number(process.hrtime.bigint() - dbStart) / 1_000_000;
    res.json({
      status: 'ok',
      db: 'up',
      db_latency_ms: Number(dbLatencyMs.toFixed(2)),
      uptime_seconds: uptimeSeconds,
      allowPublicRegister,
      email: { configured: isEmailConfigured() },
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      db: 'down',
      db_latency_ms: null,
      uptime_seconds: uptimeSeconds,
      allowPublicRegister,
      email: { configured: isEmailConfigured() },
    });
  }
});

router.get('/health/metrics', authenticate, authorize(['admin']), async (_req, res) => {
  const snapshot = await buildMetricsSnapshot();
  res.status(snapshot.httpStatus).json(snapshot.payload);
});

router.get('/health/metrics/export', authenticate, authorize(['admin']), async (req, res) => {
  const format = (typeof req.query.format === 'string' ? req.query.format : 'json').toLowerCase();
  const snapshot = await buildMetricsSnapshot();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (format === 'csv') {
    const csv = toMetricsCsv(snapshot.payload);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-${stamp}.csv"`);
    res.status(snapshot.httpStatus).send(csv);
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="metrics-${stamp}.json"`);
  res.status(snapshot.httpStatus).json(snapshot.payload);
});

/** Diagnóstico de videos (admin): modo storage, FFmpeg, límites. */
router.get('/health/media', authenticate, authorize(['admin']), async (_req, res) => {
  try {
    const capabilities = await getExerciseMediaCapabilities();
    const rssMb = Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2));
    res.json({
      ...capabilities,
      storageRemote: isMediaStorageRemote(),
      memory_rss_mb: rssMb,
      notes: capabilities.directUpload
        ? 'Upload directo a Supabase; reproducción con URL firmada (sin proxy Render).'
        : 'Desarrollo local: multipart + FFmpeg opcional.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    res.status(500).json({ error: message });
  }
});

export default router;
