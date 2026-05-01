# Curalink — AI Medical Research Assistant

## 🔬 Overview
Curalink is a full-stack AI-powered Medical Research Assistant built on the MERN stack. It acts as a health research companion that understands your condition, searches the latest medical literature, and delivers structured, source-backed answers through a conversational interface.

**Live Demo:** https://curalink-ai-medical-research-assistant-w0gl.onrender.com

---

## 🧠 How It Works
1. User enters their name, condition, and location
2. System automatically expands the query intelligently (e.g. "deep brain stimulation" → "deep brain stimulation + Parkinson's disease")
3. Parallel API calls fire to PubMed, OpenAlex, and ClinicalTrials.gov — retrieving 160+ results simultaneously
4. A custom ranking engine scores each result by relevance, recency, and citation count — filtering to the top results
5. Ranked results are fed as structured context to an open-source LLM (Mixtral via Groq)
6. LLM generates a non-hallucinated, source-cited response in a structured format
7. Full conversation history is maintained with a ChatGPT-style session sidebar

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| LLM | Mixtral (llama-3.3-70b-versatile) via Groq |
| Research APIs | PubMed, OpenAlex, ClinicalTrials.gov |
| Deployment | Render (single URL — frontend + backend) |

---

## 📦 Features
- **Structured input** — patient name, condition, location
- **Intelligent query expansion** — combines user query with disease context automatically
- **Deep retrieval** — fetches 160+ publications and trials before filtering
- **Smart ranking** — scores by relevance, recency, and citation count
- **Multi-source research** — PubMed + OpenAlex + ClinicalTrials.gov in parallel
- **LLM reasoning** — open-source model generates structured, grounded responses
- **Multi-turn conversations** — full context awareness across follow-up questions
- **Session sidebar** — all past sessions stored and accessible like ChatGPT
- **Single deployment URL** — frontend served directly from Express backend

---

## 🗂️ Project Structure
```
curalink/
├── server.js
├── package.json
├── models/
│   └── Conversation.js
├── routes/
│   └── chat.js
├── services/
│   ├── pubmed.js
│   ├── openalex.js
│   ├── clinicaltrials.js
│   ├── ranker.js
│   └── llm.js
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── App.jsx
        ├── api/
        │   └── chat.js
        └── components/
            ├── ChatWindow.jsx
            ├── MessageBubble.jsx
            ├── SourceCard.jsx
            └── TrialCard.jsx
```

---

## 🔌 Data Sources
- **PubMed (NCBI)** — peer-reviewed medical publications
- **OpenAlex** — open access academic research works
- **ClinicalTrials.gov** — ongoing and completed human clinical trials

All three are completely free with no API keys required.

---

## 🚀 Running Locally

**Prerequisites:** Node.js, MongoDB, Ollama

```bash
# Clone the repo
git clone https://github.com/KhyatiDanvirMalik/Curalink-AI-Medical-Research-Assistant

# Install backend dependencies
cd backend
npm install

# Create .env file
MONGO_URI=mongodb://localhost:27017/curalink
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
PORT=5000

# Pull the LLM model
ollama pull mistral

# Start backend
node server.js

# In a new terminal — install and start frontend
cd frontend
npm install
npm start
```

---

## 🌐 Deployment
The app is deployed on **Render** as a single service. Render builds the React frontend automatically and Express serves it — one URL for everything.

**Environment variables required on Render:**
- `MONGO_URI` — MongoDB Atlas connection string
- `GROQ_API_KEY` — Groq API key (free at console.groq.com)
- `PORT` — 5000

---

## 📋 Example Queries
- "Latest treatment options for lung cancer"
- "Clinical trials for Type 2 diabetes"
- "Recent studies on Alzheimer's disease"
- "Deep brain stimulation for Parkinson's"

---

## ⚠️ Disclaimer
Curalink is for educational and research purposes only. It does not constitute medical advice. Always consult a qualified healthcare professional for medical decisions.

---

## 👩‍💻 Built By
Khyati Malik
