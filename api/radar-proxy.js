const SUPABASE_URL = "https://vupvgdfdnpqactlqufbu.supabase.co";
const SUPABASE_KEY = "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REjV";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, stage: "proxy", error: "POST only" });
  }

  const auth = req.headers.authorization || req.headers.Authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, stage: "proxy-auth", error: "Bearer token tidak diterima Vercel." });
  }

  let payload = req.body ?? {};
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload || "{}"); }
    catch { payload = {}; }
  }

  try {
    const upstream = await fetch(SUPABASE_URL + "/functions/v1/radar-collect", {
      method: "POST",
      headers: {
        Authorization: auth,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      console.error("[RADAR_PROXY][UPSTREAM_ERROR]", upstream.status, JSON.stringify(data));
      return res.status(upstream.status).json({
        ok: false,
        stage: "supabase-edge",
        upstreamStatus: upstream.status,
        error: data?.error || data?.message || text || "Supabase Edge menolak request."
      });
    }

    return res.status(200).json({ ok: true, stage: "supabase-edge", data });
  } catch (error) {
    console.error("[RADAR_PROXY][FETCH_ERROR]", error);
    return res.status(502).json({
      ok: false,
      stage: "proxy-fetch",
      error: String(error?.message || error)
    });
  }
}