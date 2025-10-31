export type TraceLogger = (
  event: string,
  data?: Record<string, unknown>
) => void;

export function buildTraceLogger(scope: string, traceId: string): TraceLogger {
  return (event, data) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    const payload = JSON.stringify(data ?? {});
    console.info(`[${scope}][trace=${traceId}] ${event} ${payload}`);
  };
}
