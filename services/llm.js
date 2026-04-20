const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const USE_GROQ = !!GROQ_API_KEY;

// Log on startup so we can see in Render logs
console.log('=== LLM CONFIG ===');
console.log('USE_GROQ:', USE_GROQ);
console.log('GROQ_API_KEY exists:', !!GROQ_API_KEY);
console.log('GROQ_API_KEY starts with:', GROQ_API_KEY ? GROQ_API_KEY.slice(0, 8) : 'MISSING');
console.log('==================');

function buildSystemPrompt() {
  return `You are Curalink, an AI medical research assistant.
RULES:
- Only use provided research context. Never make up facts.
- Cite sources as (PUB1), (PUB2), (TRIAL1) etc.
- End with a disclaimer that this is not medical advice.`;
}

function buildUserPrompt(userMessage, disease, publications, trials) {
  const pubContext = publications
    .slice(0, 3)
    .map(
      (p, i) =>
        `[PUB${i + 1}] ${String(p.title).slice(0, 100)} (${p.platform}, ${p.year})\n${String(p.abstract || '').slice(0, 120)}`
    )
    .join('\n\n');

  const trialContext = trials
    .slice(0, 2)
    .map(
      (t, i) =>
        `[TRIAL${i + 1}] ${String(t.title).slice(0, 80)}\nStatus: ${t.status}`
    )
    .join('\n\n');

  return `Disease: ${String(disease).slice(0, 50)}
Question: ${String(userMessage).slice(0, 200)}

Publications:
${pubContext || 'None found.'}

Trials:
${trialContext || 'None found.'}

Respond with:
## Condition Overview
## Research Insights
## Clinical Trials
## Key Takeaways
## Disclaimer`;
}

async function callGroq(systemPrompt, userPrompt) {
  console.log('Calling Groq API...');
  console.log('System prompt length:', systemPrompt.length);
  console.log('User prompt length:', userPrompt.length);
  console.log('Total chars:', systemPrompt.length + userPrompt.length);

  const requestBody = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 700,
  };

  console.log('Request body (truncated):', JSON.stringify({
    model: requestBody.model,
    temperature: requestBody.temperature,
    max_tokens: requestBody.max_tokens,
    messages_count: requestBody.messages.length,
    system_length: requestBody.messages[0].content.length,
    user_length: requestBody.messages[1].content.length,
  }));

  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: requestBody,
      timeout: 30000,
    });

    console.log('Groq response status:', response.status);
    return response.data?.choices?.[0]?.message?.content || null;

  } catch (err) {
    console.error('=== GROQ ERROR DETAILS ===');
    console.error('Status:', err.response?.status);
    console.error('Status text:', err.response?.statusText);
    console.error('Error data:', JSON.stringify(err.response?.data, null, 2));
    console.error('=========================');
    throw err;
  }
}

async function callOllama(systemPrompt, userPrompt) {
  const fullPrompt = `[INST] <<SYS>>\n${systemPrompt}\n<</SYS>>\n\n${userPrompt} [/INST]`;
  const res = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.3, top_p: 0.9, num_predict: 700 },
    },
    { timeout: 120000 }
  );
  return res.data?.response || null;
}

async function generateResponse(userMessage, disease, publications, trials, history) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(userMessage, disease, publications, trials);

  console.log(`Using LLM: ${USE_GROQ ? 'Groq ' + GROQ_MODEL : 'Ollama'}`);

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
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
    console.error('Final LLM error:', errMsg);

    if (USE_GROQ) {
      console.warn('Trying Ollama fallback...');
      try {
        const fallback = await callOllama(systemPrompt, userPrompt);
        if (fallback) return fallback;
      } catch (e) {
        console.error('Ollama fallback failed:', e.message);
      }
    }

    throw new Error(USE_GROQ ? `Groq error: ${errMsg}` : `Ollama error: ${errMsg}`);
  }
}

module.exports = { generateResponse };
