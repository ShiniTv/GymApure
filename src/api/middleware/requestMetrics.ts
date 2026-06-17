import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../../lib/logger.ts';

const SLOW_REQUEST_MS = 1000;
const WARN_ERROR_RATE_PERCENT = 5;
const WARN_SLOW_RATE_PERCENT = 20;
const MAX_ROUTE_ENTRIES = 200;
const MAX_TIMELINE_POINTS = 120;
const TIMELINE_INTERVAL_MS = 30_000;

interface RequestMetricsState {
  startedAt: number;
  completed: number;
  inflight: number;
  totalDurationMs: number;
  status1xx: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  slowRequests: number;
}

interface RouteMetricsState {
  method: string;
  path: string;
  count: number;
  totalDurationMs: number;
  maxDurationMs: number;
  slowCount: number;
  errorCount: number;
  lastSeenAt: number;
}

interface TimelinePoint {
  ts: number;
  avgResponseMs: number;
  errorRatePercent: number;
  slowRatePercent: number;
  completed: number;
  inflight: number;
}

const metrics: RequestMetricsState = {
  startedAt: Date.now(),
  completed: 0,
  inflight: 0,
  totalDurationMs: 0,
  status1xx: 0,
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
  slowRequests: 0,
};

const routeMetrics = new Map<string, RouteMetricsState>();
const timeline: TimelinePoint[] = [];
let lastTimelineCaptureAt = 0;

function incrementStatusBucket(statusCode: number) {
  if (statusCode >= 500) metrics.status5xx += 1;
  else if (statusCode >= 400) metrics.status4xx += 1;
  else if (statusCode >= 300) metrics.status3xx += 1;
  else if (statusCode >= 200) metrics.status2xx += 1;
  else metrics.status1xx += 1;
}

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0] ?? null;
  }
  return req.ip ?? null;
}

function normalizePath(req: Request): string {
  const raw = req.path || req.originalUrl || '/';
  const [pathname] = raw.split('?');
  return (pathname || '/')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi,
      '/:uuid'
    );
}

function updateRouteMetrics(req: Request, statusCode: number, elapsedMs: number) {
  const path = normalizePath(req);
  const key = `${req.method} ${path}`;
  const prev = routeMetrics.get(key);

  const next: RouteMetricsState = prev
    ? {
        ...prev,
        count: prev.count + 1,
        totalDurationMs: prev.totalDurationMs + elapsedMs,
        maxDurationMs: Math.max(prev.maxDurationMs, elapsedMs),
        slowCount: prev.slowCount + (elapsedMs >= SLOW_REQUEST_MS ? 1 : 0),
        errorCount: prev.errorCount + (statusCode >= 500 ? 1 : 0),
        lastSeenAt: Date.now(),
      }
    : {
        method: req.method,
        path,
        count: 1,
        totalDurationMs: elapsedMs,
        maxDurationMs: elapsedMs,
        slowCount: elapsedMs >= SLOW_REQUEST_MS ? 1 : 0,
        errorCount: statusCode >= 500 ? 1 : 0,
        lastSeenAt: Date.now(),
      };

  routeMetrics.set(key, next);

  if (routeMetrics.size > MAX_ROUTE_ENTRIES) {
    const oldest = [...routeMetrics.entries()].sort((a, b) => a[1].lastSeenAt - b[1].lastSeenAt)[0];
    if (oldest) {
      routeMetrics.delete(oldest[0]);
    }
  }
}

function computeRates() {
  const totalErrors = metrics.status4xx + metrics.status5xx;
  const errorRatePercent =
    metrics.completed > 0 ? Number(((totalErrors / metrics.completed) * 100).toFixed(2)) : 0;
  const slowRatePercent =
    metrics.completed > 0 ? Number(((metrics.slowRequests / metrics.completed) * 100).toFixed(2)) : 0;
  return { errorRatePercent, slowRatePercent };
}

function captureTimelineIfDue(now = Date.now()) {
  if (lastTimelineCaptureAt !== 0 && now - lastTimelineCaptureAt < TIMELINE_INTERVAL_MS) {
    return;
  }
  lastTimelineCaptureAt = now;

  const avgResponseMs =
    metrics.completed > 0 ? Number((metrics.totalDurationMs / metrics.completed).toFixed(2)) : 0;
  const { errorRatePercent, slowRatePercent } = computeRates();

  timeline.push({
    ts: now,
    avgResponseMs,
    errorRatePercent,
    slowRatePercent,
    completed: metrics.completed,
    inflight: metrics.inflight,
  });

  if (timeline.length > MAX_TIMELINE_POINTS) {
    timeline.splice(0, timeline.length - MAX_TIMELINE_POINTS);
  }
}

/** Adds request-id, response time headers and in-memory request metrics. */
export function requestMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  metrics.inflight += 1;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const isSlow = elapsedMs >= SLOW_REQUEST_MS;
    metrics.inflight = Math.max(0, metrics.inflight - 1);
    metrics.completed += 1;
    metrics.totalDurationMs += elapsedMs;
    if (isSlow) {
      metrics.slowRequests += 1;
    }
    incrementStatusBucket(res.statusCode);
    updateRouteMetrics(req, res.statusCode, elapsedMs);
    captureTimelineIfDue();

    const logMeta = {
      requestId,
      method: req.method,
      path: normalizePath(req),
      statusCode: res.statusCode,
      durationMs: Number(elapsedMs.toFixed(1)),
      ip: getClientIp(req),
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request failed', logMeta);
      return;
    }
    if (isSlow) {
      logger.warn('HTTP request slow', logMeta);
    }
  });

  next();
}

export function getRequestMetricsSnapshot() {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startedAt) / 1000);
  const avgResponseMs =
    metrics.completed > 0 ? Number((metrics.totalDurationMs / metrics.completed).toFixed(2)) : 0;
  const { errorRatePercent, slowRatePercent } = computeRates();
  captureTimelineIfDue();

  const topSlowRoutes = [...routeMetrics.values()]
    .map((route) => ({
      method: route.method,
      path: route.path,
      count: route.count,
      avgDurationMs: Number((route.totalDurationMs / route.count).toFixed(2)),
      maxDurationMs: Number(route.maxDurationMs.toFixed(2)),
      slowRatePercent: Number(((route.slowCount / route.count) * 100).toFixed(2)),
      errorRatePercent: Number(((route.errorCount / route.count) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.avgDurationMs - a.avgDurationMs || b.count - a.count)
    .slice(0, 5);

  const thresholds = {
    slowMs: SLOW_REQUEST_MS,
    warnErrorRatePercent: WARN_ERROR_RATE_PERCENT,
    warnSlowRatePercent: WARN_SLOW_RATE_PERCENT,
  };

  return {
    uptimeSeconds,
    inflight: metrics.inflight,
    completed: metrics.completed,
    avgResponseMs,
    slowRequests: metrics.slowRequests,
    errorRatePercent,
    slowRatePercent,
    thresholdStatus: {
      errorRate:
        errorRatePercent >= thresholds.warnErrorRatePercent ? 'warn' : 'ok',
      slowRate:
        slowRatePercent >= thresholds.warnSlowRatePercent ? 'warn' : 'ok',
    },
    thresholds,
    topSlowRoutes,
    recentTimeline: timeline,
    status: {
      '1xx': metrics.status1xx,
      '2xx': metrics.status2xx,
      '3xx': metrics.status3xx,
      '4xx': metrics.status4xx,
      '5xx': metrics.status5xx,
    },
  };
}
