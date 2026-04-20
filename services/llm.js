const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const GROQ_MODEL = 'llama3-8b-8192';
const USE_GROQ = !!GROQ_API_KEY;

function buildSystemPrompt() {
  return `You are Curalink, an AI medical research assistant. Help users understand medical research clearly.
RULES:
- Only use the provided research context. Never make up facts.
- Cite sources as (PUB1), (PUB2), (TRIAL1) etc.
- Keep responses concise and well structured.
- End with a disclaimer that this is not medical advice.`;
}

function buildUserPrompt(userMessage, disease, publications, trials, history) {
  // Very strict limits to stay within 6000 tokens total
  const pubContext = publications
    .slice(0, 4)
    .map(
      (p, i) =>
        `[PUB${i + 1}] ${p.title} (${p.platform}, ${p.year})\n` +
        `${(p.abstract || '').slice(0, 150)}`
    )
    .join('\n\n');

  const trialContext = trials
    .slice(0, 3)
    .map(
      (t, i) =>
        `[TRIAL${i + 1}] ${t.title}\nStatus: ${t.status} | Location: ${
          t.location || 'N/A'
        }`
    )
    .join('\n\n');

  const historyText =
    history.length > 0
      ? history
          .slice(-2)
          .map((m) => `${m.role}: ${String(m.content).slice(0, 100)}`)
          .join('\n') + '\n\n'
      : '';

  return `${historyText}Disease: ${disease}
Question: ${userMessage}

Publications:
${pubContext || 'None found.'}

Trials:
${trialContext || 'None found.'}

Reply using exactly these sections:
## Condition Overview
## Research Insights
## Clinical Trials
## Key Takeaways
## Disclaimer`;
}

async function callGroq(systemPrompt, userPrompt) {
  const totalLength = systemPrompt.length + userPrompt.length;
  console.log(`Total prompt chars: ${totalLength}`);

  const response = await axios({
    method: 'post',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    data: {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 800,
    },
    timeout: 30000,
  });

  return response.data?.choices?.[0]?.message?.content || null;
}

async function callOllama(systemPrompt, userPrompt) {
  const fullPrompt = `[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${userPrompt} [/INST]`;
  const res = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.3, top_p: 0.9, num_predict: 800 },
    },
    { timeout: 120000 }
  );
  return res.data?.response || null;
}

async function generateResponse(
  userMessage,
  disease,
  publications,
  trials,
  history
) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    userMessage,
    disease,
    publications,
    trials,
    history
  );

  console.log(`LLM: ${USE_GROQ ? 'Groq ' + GROQ_MODEL : 'Ollama'}`);
  console.log(`Prompt size: ${userPrompt.length} chars`);

  try {
    let response = null;

    if (USE_GROQ) {
      response = await callGroq(systemPrompt, userPrompt);
    } else {
      response = await callOllama(systemPrompt, userPrompt);
    }

    if (!response || response.trim() === '') {
      throw new Error('LLM returned empty response');
    }

    return response;
  } catch (err) {
    // Log the full Groq error so we can see exactly what went wrong
    if (err.response?.data) {
      console.error(
        'Groq full error:',
        JSON.stringify(err.response.data, null, 2)
      );
    }

    if (USE_GROQ) {
      console.warn('Trying Ollama fallback...');
      try {
        const fallback = await callOllama(systemPrompt, userPrompt);
        if (fallback) return fallback;
      } catch (e) {
        console.error('Ollama fallback failed:', e.message);
      }
    }

    const errMsg =
      err.response?.data?.error?.message || err.message || 'Unknown error';
    throw new Error(USE_GROQ ? `Groq error: ${errMsg}` : `Ollama error: ${errMsg}`);
  }
}

module.exports = { generateResponse };
