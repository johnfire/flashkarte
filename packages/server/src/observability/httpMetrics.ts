interface HttpMetric {
  count: number;
  durationMs: number;
}

const metrics = new Map<string, HttpMetric>();

function metricKey(method: string, statusCode: number): string {
  return `${method}:${statusCode}`;
}

export function recordHttpMetric(
  method: string,
  statusCode: number,
  durationMs: number,
): void {
  const key = metricKey(method, statusCode);
  const current = metrics.get(key) ?? { count: 0, durationMs: 0 };
  metrics.set(key, {
    count: current.count + 1,
    durationMs: current.durationMs + durationMs,
  });
}

export function renderHttpMetrics(): string {
  const lines = [
    "# HELP flashkarte_http_requests_total Completed HTTP requests.",
    "# TYPE flashkarte_http_requests_total counter",
  ];
  for (const [key, metric] of metrics) {
    const [method, statusCode] = key.split(":");
    const labels = `method="${method}",status_code="${statusCode}"`;
    lines.push(`flashkarte_http_requests_total{${labels}} ${metric.count}`);
    lines.push(
      `flashkarte_http_request_duration_milliseconds_sum{${labels}} ${metric.durationMs}`,
    );
  }
  return lines.join("\n") + "\n";
}
