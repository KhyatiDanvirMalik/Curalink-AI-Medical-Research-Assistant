const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const GROQ_MODEL = 'llama3-8b-8192';
const USE_GROQ = !!GROQ_API_KEY;

function buildSystemPrompt() {
  return `You are Curalink, an expert AI medical research assistant.
Help users understand medical research clearly and accurately.

RULES:
- Only use information from the research context provided. Never hallucinate.
- Cite sources as (PUB1), (PUB2), (TRIAL1) etc.
- Always end with a disclaimer that this is not medical advice.`;
}

function buildUserPrompt(userMessage, disease, publications, trials, history) {
  // Strictly limit each abstract to 200 chars to stay within token limits
  const pubContext = publications
    .slice(0, 5)
    .map(
      (p, i) =>
        `[PUB${i + 1}] "${p.title}" (${p.platform}, ${p.year})\n` +
        `Authors: ${p.authors?.slice(0, 3).join(', ') || 'N/A'}\n` +
        `Abstract: ${(p.abstract || 'Not available').slice(0, 200)}`
    )
    .join('\n\n');

  const trialContext = trials
    .slice(0, 3)
    .map(
      (t, i) =>
        `[TRIAL${i + 1}] "${t.title}"\n` +
        `Status: ${t.status}\n` +
        `Location: ${t.location || 'Not specified'}`
    )
    .join('\n\n');

  const historyText =
    history.length > 0
      ? 'PREVIOUS CONVERSATION:\n' +
        history
          .slice(-2)
          .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}`)
          .join('\n') +
        '\n\n'
      : '';

  return `${historyText}DISEASE: ${disease}
QUERY: ${userMessage}

PUBLICATIONS:
${pubContext || 'None retrieved.'}

TRIALS:
${trialContext || 'None retrieved.'}

Respond with this structure:

## Condition Overview
[2-3 sentences about the condition]

## Research Insights
[Key findings referencing (PUB1), (PUB2) etc.]

## Clinical Trials
[Summary referencing (TRIAL1) etc.]

## Key Takeaways
[3 bullet points]

## Disclaimer
This is for educational purposes only, not medical advice. Consult a healthcare professional.`;
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
      max_tokens: 1000,
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
      options: { temperature: 0.3, top_p: 0.9, num_predict: 1000 },
    },
    { timeout: 120000 }
  );
  return res.data?.response || null;
}

async function generateResponse(userMessage, disease, publications, trials, history) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(userMessage, disease, publications, trials, history);

  console.log(`Using LLM: ${USE_GROQ ? 'Groq (' + GROQ_MODEL + ')' : 'Ollama'}`);
  console.log(`Prompt length: ${userPrompt.length} chars`);

  try {
    let response = USE_GROQ
      ? await callGroq(systemPrompt, userPrompt)
      : await callOllama(systemPrompt, userPrompt);

    if (!response || response.trim() === '') throw new Error('Empty response from LLM');
    return response;

  } catch (err) {
    if (USE_GROQ) {
      console.warn('Groq failed, trying Ollama fallback:', err.message);
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
