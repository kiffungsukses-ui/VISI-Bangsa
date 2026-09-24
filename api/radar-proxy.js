const SUPABASE_URL = "https://vupvgdfdnpqactlqufbu.supabase.co";
const SUPABASE_KEY = "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REjV";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "Authorization Bearer token diperlukan." });

  try {
    const upstream = await fetch(SUPABASE_URL + "/functions/v1/radar-collect", {
      method: "POST",
      headers: {
        Authorization: auth,
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body || {})
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    return res.send(text);
  } catch (error) {
    return res.status(502).json({ error: "Gagal menghubungi Radar Supabase.", detail: String(error?.message || error) });
  }
}