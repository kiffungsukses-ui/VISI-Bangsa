const SITE_ORIGIN = "https://visibangsa.id";
const SUPABASE_URL = "https://vupvgdfdnpqactlqufbu.supabase.co";
const SUPABASE_KEY = "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REjV";

function ok(name, details = {}) {
  return { name, status: "ok", ...details };
}

function fail(name, details = {}) {
  return { name, status: "fail", ...details };
}

async function probe(name, url, options = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
    });
    return response.ok
      ? ok(name, { httpStatus: response.status, durationMs: Date.now() - started })
      : fail(name, { httpStatus: response.status, durationMs: Date.now() - started });
  } catch (error) {
    return fail(name, {
      durationMs: Date.now() - started,
      error: String(error?.message || error),
    });
  }
}

export default async function handler(req, res) {
  const started = Date.now();

  // Guardian is intentionally read-only: it observes availability and does not
  // mutate content, authentication, or database records.
  const checks = await Promise.all([
    probe("homepage", SITE_ORIGIN + "/"),
    probe("sitemap", SITE_ORIGIN + "/sitemap.xml"),
    probe(
      "supabase-rest",
      SUPABASE_URL + "/rest/v1/berita?select=id&limit=1",
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
      }
    ),
  ]);

  const healthy = checks.every((check) => check.status === "ok");
  const result = {
    guardian: "VISI Bangsa Guardian",
    version: "1.0",
    status: healthy ? "healthy" : "degraded",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    checks,
  };

  if (!healthy) {
    console.error("[GUARDIAN]", JSON.stringify(result));
  } else {
    console.log("[GUARDIAN]", JSON.stringify(result));
  }

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.status(healthy ? 200 : 503).json(result);
}
