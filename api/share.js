export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  const origin = "https://visibangsa.id";
  const detailUrl = id ? origin + "/detail.html?id=" + encodeURIComponent(id) : origin + "/";

  if (!/^\d+$/.test(id)) {
    res.status(400).setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end("<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=" + origin + "/\"></head><body>VISI Bangsa</body></html>");
  }

  const supabaseUrl = "https://vupvgdfdnpqactlqufbu.supabase.co";
  const supabaseKey = "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REjV";

  try {
    const apiUrl = supabaseUrl + "/rest/v1/berita?select=id,judul,isi,gambar,kategori,penulis,tanggal,updated_at,status&id=eq." + encodeURIComponent(id) + "&status=eq.terbit";
    const response = await fetch(apiUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: "Bearer " + supabaseKey
      }
    });
    const rows = await response.json();
    const article = Array.isArray(rows) ? rows[0] : null;

    if (!article) {
      res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end("<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=" + origin + "/\"></head><body>Berita tidak ditemukan.</body></html>");
    }

    const esc = (v) => String(v ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    const clean = String(article.isi || "").replace(/\s+/g, " ").trim();
    const description = clean.length > 160 ? clean.slice(0, 157) + "..." : clean || "Berita terbaru dan informasi terkini dari VISI Bangsa.";
    const image = article.gambar ? new URL(article.gambar, origin).href : origin + "/favicon.ico";
    const title = String(article.judul || "VISI Bangsa");
    const category = String(article.kategori || "Berita");

    res.status(200);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.end(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | VISI Bangsa</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(detailUrl)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="VISI Bangsa">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(detailUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(title)}">
<meta property="og:image:type" content="image/jpeg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(title)}">
<meta http-equiv="refresh" content="0;url=${esc(detailUrl)}">
<script>location.replace(${JSON.stringify(detailUrl)});</script>
</head>
<body>
<p><a href="${esc(detailUrl)}">${esc(title)}</a></p>
</body>
</html>`);
  } catch (error) {
    console.error("VISI Bangsa share resolver error:", error);
    res.status(500).setHeader("Content-Type", "text/html; charset=utf-8");
    res.end("<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"refresh\" content=\"0;url=" + detailUrl + "\"></head><body>VISI Bangsa</body></html>");
  }
}
