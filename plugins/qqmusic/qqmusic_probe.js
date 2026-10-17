(() => {
  const started = Date.now();
  const stage = String(globalThis.$argument ?? "unknown");
  try {
    const body = stage === "response-body" ? globalThis.$response?.body :
      stage === "request-body" ? globalThis.$request?.body : undefined;
    const type = Object.prototype.toString.call(body).slice(8, -1);
    const size = body?.byteLength ?? body?.length ?? 0;
    console.log("QQM-DIAG-v1 stage=" + stage + " type=" + type + " bytes=" + size +
      " elapsed_ms=" + (Date.now() - started) + " PASS_THROUGH");
  } catch (_) {
    console.log("QQM-DIAG-v1 stage=" + stage + " PROBE_ERROR PASS_THROUGH");
  }
  $done({});
})();
