export default async function handler(req, res) {
  const id = String(req.query?.id || "").trim();
  if (!/^\d+$/.test(id)) {
    res.status(400).setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.end("Invalid article id");
  }

  const supabaseUrl = "https://vupvgdfdnpqactlqufbu.supabase.co";
  const supabaseKey = "sb_publishable_QmG9CJHdYzwxiRRxRmdcxQ_gZi2REJv";

  try {
    const apiUrl =
      supabaseUrl +
      "/rest/v1/berita?select=gambar&id=eq." +
      encodeURIComponent(id) +
      "&status=eq.terbit";

    const response = await fetch(apiUrl, {
      headers: {
        apikey: supabaseKey
      }
    });

    if (!response.ok) {
      throw new Error("Supabase returned HTTP " + response.status);
    }

    const rows = await response.json();
    const imageUrl = rows?.[0]?.gambar;
    if (!imageUrl) {
      res.status(404).setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end("Image not found");
    }

    const imageResponse = await fetch(new URL(imageUrl));
    if (!imageResponse.ok) {
      throw new Error("Image returned HTTP " + imageResponse.status);
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await imageResponse.arrayBuffer());

    // The source image is already a stable Supabase Storage object.
    // Cache the proxy response, but do not allow an old error response
    // to be reused as a successful thumbnail.
    res.status(200);
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("CDN-Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Vary", "Accept");
    res.setHeader("Content-Length", String(bytes.length));
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(bytes);
  } catch (error) {
    console.error("VISI Bangsa OG image error:", error);

    // Never cache a transient thumbnail failure.
    res.status(502);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("CDN-Cache-Control", "no-store");
    return res.end("Unable to load image");
  }
}
