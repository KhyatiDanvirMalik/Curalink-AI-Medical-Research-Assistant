/**
 * Score and rank publications.
 * Factors: query term overlap, recency, citation count (OpenAlex).
 */
function rankPublications(publications, queryTerms, topK = 7) {
  const currentYear = new Date().getFullYear();
  const terms = queryTerms.map((t) => t.toLowerCase());

  const scored = publications
    .filter((p) => p.title && p.title !== 'No title')
    .map((pub) => {
      let score = 0;

      // Term overlap in title (weighted heavily)
      const titleLower = pub.title.toLowerCase();
      const abstractLower = (pub.abstract || '').toLowerCase();
      for (const term of terms) {
        if (titleLower.includes(term)) score += 3;
        if (abstractLower.includes(term)) score += 1;
      }

      // Recency: papers from last 3 years get bonus
      const age = currentYear - (pub.year || 2000);
      if (age <= 2) score += 4;
      else if (age <= 5) score += 2;
      else if (age <= 10) score += 1;

      // Citation count (OpenAlex only)
      if (pub.citationCount) {
        score += Math.min(Math.log10(pub.citationCount + 1) * 2, 5);
      }

      // Penalise missing abstract
      if (!pub.abstract || pub.abstract === 'No abstract available') score -= 2;

      return { ...pub, _score: score };
    })
    .sort((a, b) => b._score - a._score);

  // Deduplicate by title similarity (simple)
  const seen = new Set();
  const deduped = [];
  for (const pub of scored) {
    const key = pub.title.toLowerCase().slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(pub);
    }
  }

  return deduped.slice(0, topK);
}

function rankTrials(trials, topK = 5) {
  const statusPriority = {
    RECRUITING: 10,
    ACTIVE_NOT_RECRUITING: 6,
    COMPLETED: 3,
  };

  return trials
    .filter((t) => t.title && t.title !== 'No title')
    .map((t) => ({
      ...t,
      _score: statusPriority[t.status] || 0,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, topK);
}

module.exports = { rankPublications, rankTrials };