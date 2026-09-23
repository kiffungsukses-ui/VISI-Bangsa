export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  if (!/^\d+$/.test(id)) {
    res.status(400).setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Invalid article id");
  }

  const supabaseUrl = "https://vupvgdfdnpqactlqufbu.supabase.co";
  const supabaseKey = "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REjV";

  try {
    const apiUrl =
      supabaseUrl +
      "/rest/v1/berita?select=gambar&id=eq." +
      encodeURIComponent(id) +
      "&status=eq.terbit";

    const response = await fetch(apiUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: "Bearer " + supabaseKey
      }
    });

    if (!response.ok) throw new Error("Supabase returned HTTP " + response.status);

    const rows = await response.json();
    const imageUrl = rows?.[0]?.gambar;
    if (!imageUrl) {
      res.status(404).setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end("Image not found");
    }

    const imageResponse = await fetch(new URL(imageUrl));
    if (!imageResponse.ok) throw new Error("Image returned HTTP " + imageResponse.status);

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";
    const cacheControl =
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", cacheControl);
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(bytes);
  } catch (error) {
    console.error("VISI Bangsa OG image error:", error);
    res.status(502).setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Unable to load image");
  }
}
