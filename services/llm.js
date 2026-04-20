const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const USE_GROQ = !!GROQ_API_KEY;

function buildSystemPrompt() {
  return `You are Curalink, an AI medical research assistant.
RULES:
- Only use the provided research context. Never make up facts.
- Cite sources as (PUB1), (PUB2), (TRIAL1) etc.
- End with a disclaimer that this is not medical advice.
- If this is a follow-up question (conversation history exists), do NOT repeat the Condition Overview. Just answer the specific question with new research insights.
- Keep responses focused and concise.`;
}

function buildUserPrompt(userMessage, disease, publications, trials, history) {
  const isFollowUp = history.length > 0;

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
        `[TRIAL${i + 1}] ${String(t.title).slice(0, 80)}\nStatus: ${t.status} | Location: ${t.location || 'N/A'}`
    )
    .join('\n\n');

  const historyText =
    isFollowUp
      ? 'PREVIOUS CONVERSATION:\n' +
        history
          .slice(-4)
          .map((m) => `${m.role}: ${String(m.content).slice(0, 150)}`)
          .join('\n') +
        '\n\n'
      : '';

  // Different response structure for first vs follow-up messages
  const responseStructure = isFollowUp
    ? `This is a follow-up question. Do NOT repeat the Condition Overview.
Respond with only these sections:

## Research Insights
[Answer the specific question using the publications. Reference as (PUB1), (PUB2) etc.]

## Clinical Trials
[Only include if trials are directly relevant to this specific question. Otherwise skip this section.]

## Key Takeaways
[2-3 bullet points specific to this question only]

## Disclaimer
This is for educational purposes only, not medical advice. Consult a healthcare professional.`
    : `This is the first question. Respond with all sections:

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

  return `${historyText}Disease: ${String(disease).slice(0, 50)}
Question: ${String(userMessage).slice(0, 200)}

Publications:
${pubContext || 'None found.'}

Trials:
${trialContext || 'None found.'}

${responseStructure}`;
}

async function callGroq(systemPrompt, userPrompt) {
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

async function generateResponse(userMessage, disease, publications, trials, history) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(userMessage, disease, publications, trials, history);

  console.log(`Using LLM: ${USE_GROQ ? 'Groq ' + GROQ_MODEL : 'Ollama'}`);
  console.log(`Is follow-up: ${history.length > 0}`);

  try {
    let response = USE_GROQ
      ? await callGroq(systemPrompt, userPrompt)
      : await callOllama(systemPrompt, userPrompt);

    if (!response || response.trim() === '') throw new Error('Empty response from LLM');
    return response;

  } catch (err) {
    if (err.response?.data) {
      console.error('Groq error:', JSON.stringify(err.response.data));
    }
    if (USE_GROQ) {
      try {
        const fallback = await callOllama(systemPrompt, userPrompt);
        if (fallback) return fallback;
      } catch (e) {
        console.error('Ollama fallback failed:', e.message);
      }
    }
    const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
    throw new Error(USE_GROQ ? `Groq error: ${errMsg}` : `Ollama error: ${errMsg}`);
  }
}

module.exports = { generateResponse };
