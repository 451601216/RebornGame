import type { LifeProfile, ProfileFingerprint } from "./types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w]/g, "")
    .trim();
}

function overlapScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const setA = new Set(na.split(""));
  const setB = new Set(nb.split(""));
  let inter = 0;
  for (const ch of setA) {
    if (setB.has(ch)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type SimilarityReject = {
  tooSimilar: true;
  reason: string;
  againstId: string;
};

export type SimilarityOk = { tooSimilar: false };

export function checkProfileSimilarity(
  profile: LifeProfile,
  past: ProfileFingerprint[],
): SimilarityReject | SimilarityOk {
  for (const fp of past) {
    const eraScore = overlapScore(profile.era, fp.era);
    const bgScore = overlapScore(profile.background, fp.background);
    const themeScore = overlapScore(profile.themeHook, fp.themeHook);
    const traitOverlap =
      profile.traits.filter((t) =>
        fp.traits.some((pt) => overlapScore(t, pt) >= 0.8),
      ).length / Math.max(profile.traits.length, 1);

    const sameEra = eraScore >= 0.75;
    const sameBg = bgScore >= 0.55;
    const sameTheme = themeScore >= 0.6;
    const sameTraits = traitOverlap >= 0.5;

    const dimensionsHit = [sameEra, sameBg, sameTheme, sameTraits].filter(Boolean).length;

    // Require difference on at least 3 dimensions → reject if fewer than 3 differ (i.e. hit >= 2 strong collisions with era+bg or theme)
    if ((sameEra && sameBg) || dimensionsHit >= 3 || (sameTheme && sameBg && sameEra)) {
      return {
        tooSimilar: true,
        againstId: fp.id,
        reason: `与 ${fp.id} 过于相似（时代=${profile.era}/${fp.era}，出身相近=${sameBg}，课题相近=${sameTheme}）。请在阶层、地域/时代、身份、冲突类型、心性课题上拉开至少 3 个维度差异。`,
      };
    }
  }
  return { tooSimilar: false };
}
