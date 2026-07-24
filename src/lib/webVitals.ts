import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

const SAMPLE_RATE = 0.1;

type NavigationType = 'navigate' | 'reload' | 'back-forward' | 'prerender' | 'restore' | 'unknown';

function shouldSample(): boolean {
  return Math.random() < SAMPLE_RATE;
}

function currentRoutePath(): string {
  return window.location.pathname.slice(0, 160) || '/';
}

function navigationType(value: string): NavigationType {
  if (
    value === 'navigate' ||
    value === 'reload' ||
    value === 'back-forward' ||
    value === 'prerender' ||
    value === 'restore'
  ) {
    return value;
  }
  return 'unknown';
}

function reportMetric(metric: Metric): void {
  const body = JSON.stringify({
    name: metric.name,
    value: Number(metric.value.toFixed(3)),
    rating: metric.rating,
    routePath: currentRoutePath(),
    navigationType: navigationType(metric.navigationType),
  });

  void fetch('/api/telemetry/web-vitals', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {
    // Telemetry must never affect the user experience.
  });
}

/** Reports an anonymous 10% sample to the internal metrics store. Sentry BrowserTracing reports the same signals when configured. */
export function startWebVitalsReporting(): void {
  if (!shouldSample()) return;

  onCLS(reportMetric);
  onFCP(reportMetric);
  onINP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}
