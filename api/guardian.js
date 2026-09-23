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

    const bodyText = await response.text();

    if (!response.ok) {
      return fail(name, {
        httpStatus: response.status,
        durationMs: Date.now() - started,
        error: bodyText.slice(0, 500),
      });
    }

    return ok(name, {
      httpStatus: response.status,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    return fail(name, {
      durationMs: Date.now() - started,
      error: String(error?.message || error),
    });
  }
}

async function probePublishedNews() {
  const name = "public-published-news";
  const started = Date.now();
  const url =
    SUPABASE_URL +
    "/rest/v1/berita?select=id,status,judul&status=eq.terbit&order=id.desc&limit=1";

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
      },
      signal: AbortSignal.timeout(8000),
    });

    const text = await response.text();

    if (!response.ok) {
      return fail(name, {
        httpStatus: response.status,
        durationMs: Date.now() - started,
        error: text.slice(0, 500),
        diagnosis:
          "Pengunjung anonim tidak dapat membaca berita terbit. Periksa grant SELECT dan RLS policy public.berita.",
      });
    }

    let rows;
    try {
      rows = JSON.parse(text);
    } catch {
      return fail(name, {
        httpStatus: response.status,
        durationMs: Date.now() - started,
        error: "Supabase REST returned non-JSON data.",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return fail(name, {
        httpStatus: response.status,
        durationMs: Date.now() - started,
        diagnosis:
          "API publik hidup tetapi tidak menemukan berita dengan status='terbit'.",
      });
    }

    return ok(name, {
      httpStatus: response.status,
      durationMs: Date.now() - started,
      latestPublishedId: rows[0]?.id ?? null,
      latestPublishedTitle: rows[0]?.judul ?? null,
      accessModel: "anonymous-publishable-key",
    });
  } catch (error) {
    return fail(name, {
      durationMs: Date.now() - started,
      error: String(error?.message || error),
    });
  }
}

async function probeHomepageContent() {
  const name = "homepage-content";
  const started = Date.now();

  try {
    const response = await fetch(SITE_ORIGIN + "/", {
      signal: AbortSignal.timeout(8000),
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    const html = await response.text();

    if (!response.ok) {
      return fail(name, {
        httpStatus: response.status,
        durationMs: Date.now() - started,
        error: "Homepage HTTP request failed.",
      });
    }

    const hasBrand = /VISI\s*Bangsa/i.test(html);
    const hasSupabaseClient = /supabase/i.test(html);

    if (!hasBrand || !hasSupabaseClient) {
      return fail(name, {
        httpStatus: response.status,
        durationMs: Date.now() - started,
        diagnosis: "Homepage HTML tidak memuat penanda aplikasi yang diharapkan.",
      });
    }

    return ok(name, {
      httpStatus: response.status,
      durationMs: Date.now() - started,
      htmlBytes: Buffer.byteLength(html, "utf8"),
    });
  } catch (error) {
    return fail(name, {
      durationMs: Date.now() - started,
      error: String(error?.message || error),
    });
  }
}

export default async function handler(req, res) {
  const started = Date.now();

  // Guardian is intentionally read-only. It tests the site from the public
  // visitor path and never mutates content, authentication, or database rows.
  const checks = await Promise.all([
    probeHomepageContent(),
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
    probePublishedNews(),
  ]);

  const healthy = checks.every((check) => check.status === "ok");
  const result = {
    guardian: "VISI Bangsa Guardian",
    version: "2.0-public-path",
    status: healthy ? "healthy" : "critical",
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    checks,
  };

  if (!healthy) {
    console.error("[GUARDIAN][CRITICAL]", JSON.stringify(result));
  } else {
    console.log("[GUARDIAN][OK]", JSON.stringify(result));
  }

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.status(healthy ? 200 : 503).json(result);
}
