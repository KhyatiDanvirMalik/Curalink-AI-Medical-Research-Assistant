const axios = require('axios');

async function fetchOpenAlex(query, maxResults = 80) {
  try {
    const perPage = Math.min(maxResults, 200);
    const res = await axios.get('https://api.openalex.org/works', {
      params: {
        search: query,
        'per-page': perPage,
        page: 1,
        sort: 'relevance_score:desc',
        filter: 'from_publication_date:2015-01-01',
      },
      headers: {
        'User-Agent': 'Curalink/1.0 (mailto:admin@curalink.dev)',
      },
    });

    const works = res.data?.results || [];

    return works.map((w) => {
      const authors = (w.authorships || [])
        .slice(0, 5)
        .map((a) => a?.author?.display_name)
        .filter(Boolean);

      return {
        title: w.title || 'No title',
        abstract: w.abstract_inverted_index
          ? reconstructAbstract(w.abstract_inverted_index).slice(0, 600)
          : 'No abstract available',
        authors,
        year: w.publication_year || 0,
        platform: 'OpenAlex',
        url: w.primary_location?.landing_page_url || w.id || '#',
        citationCount: w.cited_by_count || 0,
        openAlex_id: w.id,
      };
    });
  } catch (err) {
    console.error('OpenAlex error:', err.message);
    return [];
  }
}

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return '';
  const words = {};
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return Object.keys(words)
    .sort((a, b) => a - b)
    .map((k) => words[k])
    .join(' ');
}

module.exports = { fetchOpenAlex };
