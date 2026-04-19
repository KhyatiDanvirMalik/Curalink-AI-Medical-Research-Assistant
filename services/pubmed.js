const axios = require('axios');
const xml2js = require('xml2js');

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

async function fetchPubMed(query, maxResults = 80) {
  try {
    // Step 1: Search for IDs
    const searchRes = await axios.get(`${BASE}/esearch.fcgi`, {
      params: {
        db: 'pubmed',
        term: query,
        retmax: maxResults,
        sort: 'pub date',
        retmode: 'json',
      },
    });

    const ids = searchRes.data.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: Fetch full details for all IDs
    const fetchRes = await axios.get(`${BASE}/efetch.fcgi`, {
      params: {
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml',
      },
    });

    const parsed = await xml2js.parseStringPromise(fetchRes.data, {
      explicitArray: false,
    });

    const articles =
      parsed?.PubmedArticleSet?.PubmedArticle || [];
    const list = Array.isArray(articles) ? articles : [articles];

    return list.map((art) => {
      const med = art?.MedlineCitation?.Article || {};
      const pmid = art?.MedlineCitation?.PMID?._ || art?.MedlineCitation?.PMID || '';
      const title = med?.ArticleTitle?._ || med?.ArticleTitle || 'No title';
      const abstract =
        med?.Abstract?.AbstractText?._ ||
        med?.Abstract?.AbstractText ||
        'No abstract available';
      const journal = med?.Journal?.Title || '';
      const pubYear =
        med?.Journal?.JournalIssue?.PubDate?.Year ||
        med?.ArticleDate?.Year ||
        'Unknown';

      const authorList = med?.AuthorList?.Author || [];
      const authors = (Array.isArray(authorList) ? authorList : [authorList])
        .slice(0, 5)
        .map((a) => `${a.ForeName || ''} ${a.LastName || ''}`.trim())
        .filter(Boolean);

      return {
        title: String(title),
        abstract: String(abstract).slice(0, 600),
        authors,
        year: Number(pubYear) || 0,
        platform: 'PubMed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        pmid: String(pmid),
      };
    });
  } catch (err) {
    console.error('PubMed error:', err.message);
    return [];
  }
}

module.exports = { fetchPubMed };