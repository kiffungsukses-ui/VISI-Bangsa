export default async function handler(req, res) {
  const SUPABASE_URL =
    "https://vupvgdfdnpqactlqufbu.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REjV";

  try {
    const response = await fetch(
      SUPABASE_URL +
        "/rest/v1/berita" +
        "?select=id,tanggal,updated_at" +
        "&status=eq.terbit" +
        "&order=tanggal.desc",
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Supabase request failed");
    }

    const berita = await response.json();

    const forwardedHost =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "visibangsa.id";

    const host = String(forwardedHost)
      .split(",")[0]
      .trim();

    const origin =
      host === "visibangsa.id" || host === "www.visibangsa.id"
        ? "https://visibangsa.id"
        : host === "localhost" || host.startsWith("127.0.0.1")
          ? `http://${host}`
          : "https://visibangsa.id";

    const urls = [];

    urls.push(`
      <url>
        <loc>${origin}/</loc>
        <changefreq>hourly</changefreq>
        <priority>1.0</priority>
      </url>
    `);

    for (const item of berita) {
      const lastmod = item.updated_at || item.tanggal;
      if (!lastmod) continue;

      urls.push(`
        <url>
          <loc>${origin}/detail.html?id=${encodeURIComponent(
            item.id
          )}</loc>
          <lastmod>${new Date(lastmod).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;

    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

    res.status(200).send(xml);
  } catch (error) {
    console.error(error);
    res.status(500).send("Gagal membuat sitemap.");
  }
}
