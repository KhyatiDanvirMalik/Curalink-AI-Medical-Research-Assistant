const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const GROQ_MODEL = 'mixtral-8x7b-32768';

// Automatically use Groq if API key is present, else fall back to local Ollama
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
[2-3 sentences giving an overview of the condition relevant to the user's query]

## Research Insights
[Summarise the key findings from the publications above. Reference each source inline as (PUB1), (PUB2) etc. Be specific, evidence-based, and personalized to the disease context.]

## Clinical Trials
[Summarise relevant trials from above. Reference as (TRIAL1), (TRIAL2) etc. Mention their status and what intervention or treatment they are testing.]

## Key Takeaways
[3-4 concise bullet points summarising the most important insights from the research and trials]

## Disclaimer
This information is for educational and research purposes only and does not constitute medical advice. Always consult a qualified healthcare professional before making any medical decisions.`;
}

// ─── Groq (used when deployed / GROQ_API_KEY is set) ────────────────────────
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

// ─── Ollama (used locally when no GROQ_API_KEY) ──────────────────────────────
async function callOllama(systemPrompt, userPrompt) {
  const fullPrompt = `[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${userPrompt} [/INST]`;

  const res = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 1200,
      },
    },
    { timeout: 120000 } // Ollama can be slower locally, give it 2 minutes
  );

  return res.data?.response || null;
}

// ─── Main exported function ──────────────────────────────────────────────────
async function generateResponse(userMessage, disease, publications, trials, history) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(userMessage, disease, publications, trials, history);

  console.log(`Using LLM: ${USE_GROQ ? 'Groq (' + GROQ_MODEL + ')' : 'Ollama (' + OLLAMA_MODEL + ')'}`);

  try {
    let response = null;

    if (USE_GROQ) {
      response = await callGroq(systemPrompt, userPrompt);
    } else {
      response = await callOllama(systemPrompt, userPrompt);
    }

    if (!response || response.trim() === '') {
      throw new Error('LLM returned an empty response.');
    }

    return response;

  } catch (err) {
    // If Groq fails, try falling back to Ollama automatically
    if (USE_GROQ) {
      console.warn('Groq failed, attempting Ollama fallback:', err.message);
      try {
        const fallback = await callOllama(systemPrompt, userPrompt);
        if (fallback) return fallback;
      } catch (fallbackErr) {
        console.error('Ollama fallback also failed:', fallbackErr.message);
      }
    }

    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.error('LLM error:', errMsg);
    throw new Error(
      USE_GROQ
        ? `Groq API error: ${errMsg}. Check your GROQ_API_KEY in .env`
        : `Ollama error: ${errMsg}. Make sure Ollama is running with: ollama serve`
    );
  }
}

module.exports = { generateResponse };