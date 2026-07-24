-- Anonymous, sampled client performance signals. Do not store user IDs, IPs, URLs with query strings, or device identifiers.
CREATE TABLE web_vitals_metrics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  metric_name TEXT NOT NULL CHECK (metric_name IN ('CLS', 'FCP', 'INP', 'LCP', 'TTFB')),
  metric_value NUMERIC(12, 3) NOT NULL CHECK (metric_value >= 0),
  metric_rating TEXT NOT NULL CHECK (metric_rating IN ('good', 'needs-improvement', 'poor')),
  route_path TEXT NOT NULL CHECK (route_path ~ '^/' AND length(route_path) <= 160),
  navigation_type TEXT NOT NULL CHECK (navigation_type IN ('navigate', 'reload', 'back-forward', 'prerender', 'restore', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_web_vitals_metrics_metric_created_at
  ON web_vitals_metrics (metric_name, created_at DESC);

CREATE INDEX idx_web_vitals_metrics_route_created_at
  ON web_vitals_metrics (route_path, created_at DESC);

ALTER TABLE web_vitals_metrics ENABLE ROW LEVEL SECURITY;
