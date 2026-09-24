/**
 * VISI Bangsa Radar Engine v0.1
 * Tujuan: mengubah banyak sinyal menjadi arah perhatian redaksi.
 * Engine ini tidak menulis berita dan tidak menggantikan verifikasi wartawan.
 */

export const RADAR_VERSION = "0.1";

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));

const WEIGHTS = {
  novelty: 0.20,
  acceleration: 0.18,
  impact: 0.18,
  locality: 0.14,
  sourceAgreement: 0.12,
  coverageGap: 0.10,
  persistence: 0.08,
};

export function scoreSignal(signal) {
  const parts = {
    novelty: clamp(signal.novelty),
    acceleration: clamp(signal.acceleration),
    impact: clamp(signal.impact),
    locality: clamp(signal.locality),
    sourceAgreement: clamp(signal.sourceAgreement),
    coverageGap: clamp(signal.coverageGap),
    persistence: clamp(signal.persistence),
  };

  const score = Object.entries(WEIGHTS)
    .reduce((sum, [key, weight]) => sum + parts[key] * weight, 0);

  const confidence = Math.round(
    0.45 * parts.sourceAgreement +
    0.25 * parts.persistence +
    0.20 * parts.locality +
    0.10 * parts.novelty
  );

  let status = "rendah";
  if (score >= 75) status = "prioritas";
  else if (score >= 55) status = "pantau";

  return {
    ...signal,
    score: Math.round(score),
    confidence: Math.round(confidence),
    status,
    scoreBreakdown: Object.fromEntries(
      Object.entries(parts).map(([key, value]) => [
        key,
        Math.round(value * WEIGHTS[key])
      ])
    ),
  };
}

export function clusterSignals(signals) {
  const clusters = new Map();

  for (const raw of signals) {
    const signal = scoreSignal(raw);
    const key = String(
      signal.cluster ||
      signal.topic ||
      signal.category ||
      "lainnya"
    ).trim().toLowerCase();

    if (!clusters.has(key)) {
      clusters.set(key, {
        key,
        topic: signal.topic || signal.category || key,
        signals: [],
      });
    }
    clusters.get(key).signals.push(signal);
  }

  return [...clusters.values()]
    .map(cluster => {
      const signalsSorted = [...cluster.signals].sort((a, b) => b.score - a.score);
      const maxScore = signalsSorted[0]?.score || 0;
      const avgConfidence = signalsSorted.length
        ? Math.round(signalsSorted.reduce((n, s) => n + s.confidence, 0) / signalsSorted.length)
        : 0;
      const sources = [...new Set(
        signalsSorted.flatMap(s => Array.isArray(s.sources) ? s.sources : [])
      )];

      return {
        ...cluster,
        signals: signalsSorted,
        score: maxScore,
        confidence: avgConfidence,
        sourceCount: sources.length,
        sources,
        direction: editorialDirection(signalsSorted),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function editorialDirection(signals) {
  if (!signals.length) return "Belum ada arah";

  const locations = [...new Set(signals.flatMap(s => s.locations || []))];
  const categories = [...new Set(signals.map(s => s.category).filter(Boolean))];
  const top = signals[0];

  const pieces = [];
  if (locations.length) pieces.push(`wilayah: ${locations.slice(0, 4).join(", ")}`);
  if (categories.length) pieces.push(`kanal: ${categories.slice(0, 3).join(", ")}`);
  if (top.reason) pieces.push(top.reason);

  return pieces.join(" • ") || "Perlu pengumpulan sinyal tambahan";
}

export function buildRadar(signals, now = new Date().toISOString()) {
  const scored = signals.map(scoreSignal);
  const clusters = clusterSignals(signals);

  return {
    radarVersion: RADAR_VERSION,
    generatedAt: now,
    totalSignals: scored.length,
    priorityClusters: clusters.filter(c => c.score >= 75),
    watchClusters: clusters.filter(c => c.score >= 55 && c.score < 75),
    clusters,
    audit: {
      scoringWeights: WEIGHTS,
      rule: "Skor adalah alat prioritas internal; setiap sinyal tetap harus diverifikasi sebelum dipublikasikan.",
    },
  };
}
