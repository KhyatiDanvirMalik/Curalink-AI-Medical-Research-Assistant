const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { fetchPubMed } = require('../services/pubmed');
const { fetchOpenAlex } = require('../services/openalex');
const { fetchClinicalTrials } = require('../services/clinicaltrials');
const { rankPublications, rankTrials } = require('../services/ranker');
const { generateResponse } = require('../services/llm');

function expandQuery(disease, userQuery) {
  const diseaseTerms = disease ? disease.trim() : '';
  const queryTerms = userQuery ? userQuery.trim() : '';
  if (!diseaseTerms) return queryTerms;
  if (queryTerms.toLowerCase().includes(diseaseTerms.toLowerCase()))
    return queryTerms;
  return `${queryTerms} ${diseaseTerms}`;
}

router.post('/message', async (req, res) => {
  const { sessionId, userMessage, disease, patientName, location } = req.body;

  if (!sessionId || !userMessage) {
    return res
      .status(400)
      .json({ error: 'sessionId and userMessage are required.' });
  }

  try {
    let convo = await Conversation.findOne({ sessionId });
    if (!convo) {
      convo = new Conversation({
        sessionId,
        patientName: patientName || 'Anonymous',
        disease: disease || 'General',
        location: location || '',
        messages: [],
      });
    }

    convo.messages.push({ role: 'user', content: userMessage });

    const expandedQuery = expandQuery(convo.disease, userMessage);
    const queryTerms = expandedQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 3);

    // Fetch from all 3 sources in parallel
    const [pubmedResults, openalexResults, trialsResults] = await Promise.all([
      fetchPubMed(expandedQuery, 30),
      fetchOpenAlex(expandedQuery, 30),
      fetchClinicalTrials(convo.disease, userMessage, 20),
    ]);

    const allPublications = [...pubmedResults, ...openalexResults];
    // Only top 4 publications and 3 trials to keep prompt small
    const rankedPublications = rankPublications(allPublications, queryTerms, 4);
    const rankedTrials = rankTrials(trialsResults, 3);

    const history = convo.messages.slice(0, -1);

    const llmResponse = await generateResponse(
      userMessage,
      convo.disease,
      rankedPublications,
      rankedTrials,
      history
    );

    const assistantMessage = {
      role: 'assistant',
      content: llmResponse,
      sources: rankedPublications.map((p) => ({
        title: p.title,
        authors: p.authors,
        year: p.year,
        url: p.url,
        platform: p.platform,
        snippet: p.abstract?.slice(0, 150),
      })),
      trials: rankedTrials.map((t) => ({
        title: t.title,
        status: t.status,
        eligibility: t.eligibility,
        location: t.location,
        contact: t.contact,
        url: t.url,
      })),
    };

    convo.messages.push(assistantMessage);
    convo.updatedAt = new Date();
    await convo.save();

    res.json({ sessionId, message: assistantMessage });
  } catch (err) {
    console.error('Chat route error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.get('/history/:sessionId', async (req, res) => {
  try {
    const convo = await Conversation.findOne({
      sessionId: req.params.sessionId,
    });
    if (!convo) return res.json({ messages: [] });
    res.json({
      messages: convo.messages,
      disease: convo.disease,
      patientName: convo.patientName,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
