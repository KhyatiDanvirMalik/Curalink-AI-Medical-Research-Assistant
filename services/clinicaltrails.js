const axios = require('axios');

async function fetchClinicalTrials(disease, query, maxResults = 50) {
  try {
    const res = await axios.get('https://clinicaltrials.gov/api/v2/studies', {
      params: {
        'query.cond': disease,
        'query.term': query,
        'filter.overallStatus': 'RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED',
        pageSize: maxResults,
        format: 'json',
      },
    });

    const studies = res.data?.studies || [];

    return studies.map((s) => {
      const proto = s.protocolSection || {};
      const id = proto.identificationModule || {};
      const status = proto.statusModule || {};
      const desc = proto.descriptionModule || {};
      const eligibility = proto.eligibilityModule || {};
      const contacts = proto.contactsLocationsModule || {};

      const locationList = contacts.locations || [];
      const locationStr = locationList
        .slice(0, 3)
        .map((l) => `${l.city || ''}, ${l.country || ''}`.trim())
        .join(' | ');

      const centralContacts = contacts.centralContacts || [];
      const contactStr = centralContacts
        .slice(0, 1)
        .map((c) => `${c.name || ''} (${c.email || c.phone || 'N/A'})`)
        .join('');

      return {
        nctId: id.nctId || '',
        title: id.briefTitle || 'No title',
        status: status.overallStatus || 'Unknown',
        startDate: status.startDateStruct?.date || '',
        summary: desc.briefSummary?.slice(0, 400) || '',
        eligibility: eligibility.eligibilityCriteria?.slice(0, 400) || 'See full record',
        location: locationStr || 'Not specified',
        contact: contactStr || 'See ClinicalTrials.gov',
        url: `https://clinicaltrials.gov/study/${id.nctId || ''}`,
      };
    });
  } catch (err) {
    console.error('ClinicalTrials error:', err.message);
    return [];
  }
}

module.exports = { fetchClinicalTrials };
