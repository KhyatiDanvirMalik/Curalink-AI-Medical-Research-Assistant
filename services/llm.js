const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const GROQ_MODEL = 'mixtral-8x7b-32768';
const USE_GROQ = !!GROQ_API_KEY;

function buildSystemPrompt() {
  return `You are Curalink, an expert AI medical research assistant.
Your role is to help users understand medical research in a clear, accurate, and structured way.

STRICT RULES:
- Only use information provided in the research context below. Never hallucinate facts.
- Always cite sources by referencing the publication title or trial name using the [PUB1], [TRIAL1] style tags.
- Structure your response clearly using the exact sections specified below.
- If retrieved information is insufficient to answer, say so honestly instead of guessing.
- Use plain, accessible language. Avoid unnecessary medical jargon unless explaining it.
- Always end with a disclaimer that this is research information, not medical advice.`;
}

function buildUserPrompt(userMessage, disease, publications, trials, history) {
  const pubContext = publications
    .map(
      (p, i) =>
        `[PUB${i + 1}] "${p.title}" (${p.platform}, ${p.year})\n` +
        `Authors: ${p.authors?.join(', ') || 'N/A'}\n` +
        `Abstract: ${p.abstract || 'Not available'}`
    )
    .join('\n\n');

  const trialContext = trials
    .map(
      (t, i) =>
        `[TRIAL${i + 1}] "${t.title}"\n` +
        `Status: ${t.status}\n` +
        `Location: ${t.location || 'Not specified'}\n` +
        `Eligibility: ${t.eligibility || 'See full record'}`
    )
    .join('\n\n');

  const historyText =
    history.length > 0
      ? 'PREVIOUS CONVERSATION:\n' +
        history
          .slice(-4)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n') +
        '\n\n'
      : '';

  return `${historyText}PRIMARY DISEASE CONTEXT: ${disease}
CURRENT USER QUERY: ${userMessage}

RESEARCH PUBLICATIONS RETRIEVED:
${pubContext || 'No publications were retrieved for this query.'}

CLINICAL TRIALS RETRIEVED:
${trialContext || 'No clinical trials were retrieved for this query.'}

---
Using ONLY the information above, respond with EXACTLY this structure:

## Condition Overview
[2-3 sentences giving an overview of the condition relevant to the user query]

## Research Insights
[Summarise key findings from the publications. Reference each as (PUB1), (PUB2) etc.]

## Clinical Trials
[Summarise relevant trials. Reference as (TRIAL1), (TRIAL2) etc.]

## Key Takeaways
[3-4 bullet points of the most important insights]

## Disclaimer
This information is for educational and research purposes only and does not constitute medical advice. Always consult a qualified healthcare professional.`;
}

async function callGroq(systemPrompt, userPrompt) {
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return res.data?.choices?.[0]?.message?.content || null;
}

async function callOllama(systemPrompt, userPrompt) {
  const fullPrompt = `[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${userPrompt} [/INST]`;
  const res = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.3, top_p: 0.9, num_predict: 1200 },
    },
    { timeout: 120000 }
  );
  return res.data?.response || null;
}

async function generateResponse(userMessage, disease, publications, trials, history) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(userMessage, disease, publications, trials, history);
  console.log(`Using LLM: ${USE_GROQ ? 'Groq' : 'Ollama'}`);

  try {
    let response = USE_GROQ
      ? await callGroq(systemPrompt, userPrompt)
      : await callOllama(systemPrompt, userPrompt);

    if (!response || response.trim() === '') throw new Error('Empty response from LLM');
    return response;
  } catch (err) {
    if (USE_GROQ) {
      try {
        const fallback = await callOllama(systemPrompt, userPrompt);
        if (fallback) return fallback;
      } catch (e) {
        console.error('Ollama fallback failed:', e.message);
      }
    }
    throw new Error(
      USE_GROQ ? `Groq error: ${err.message}` : `Ollama error: ${err.message}`
    );
  }
}

module.exports = { generateResponse };
