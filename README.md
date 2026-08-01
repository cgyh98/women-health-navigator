# Women's Health Navigator

> AI-powered health companion for understanding medical documents, answering women's health questions, and preparing for doctor visits — built with Gemma 4 via Cerebras and WebLLM.

**Hackathon:** Build with Gemma NYC: On-Device AI for Healthcare (Kaggle)
**Track:** AI / Agent backend + React frontend

---

## The Problem

Women face a specific, recurring gap in healthcare: they leave appointments with documents they can't parse, questions they forgot to ask, and symptoms they don't know how to describe. This isn't a literacy problem — it's a translation problem. Medical language is a different language.

Existing tools either require a subscription, send data to opaque servers, or give generic advice that doesn't account for the actual document in front of you. None of them close the loop between "I have this discharge note" and "now I know what to do next."

---

## The Solution

Women's Health Navigator is a three-tab mobile app that does three things:

1. **Reads your medical documents** — upload a PDF (lab results, discharge notes, referrals), get a plain-language summary with next steps, questions to ask your provider, and red flags to watch for
2. **Answers your health questions** — type a question about symptoms, cycles, pregnancy, or reproductive health; get a sourced answer from Mayo Clinic, NIH, CDC, or ACOG
3. **Builds a living summary** — as you describe your symptoms in chat, a structured summary grows in real time, ready to hand to a doctor

The key feature: after you upload a document, the chat tab becomes document-aware. You can ask "what does this say about my iron levels?" and Gemma answers from your actual document, not from generic training data.

---

## Gemma 4 Architecture

### Two inference modes

| | Cerebras (cloud) | WebLLM (on-device) |
|---|---|---|
| Model | Gemma 4 31B | Gemma 2 2B |
| Inference | Cerebras AI cloud | WebGPU in-browser |
| Speed | ~0.5–1s | 10–30s |
| Privacy | data leaves device | zero data transmitted |
| Use case | demo, document analysis | privacy-critical users |

Both versions are in this repo. The Cerebras version is the primary demo path; the WebLLM version (`webllm/`) is the on-device alternative for users who want no data to leave their browser.

### Three-tier Q&A pipeline

Every question routed through `POST /api/ask` hits three tiers in order:

```
Question
   │
   ▼
[Tier 1] Knowledge Base — keyword match against 8 curated topics
   │  Hit: instant, zero API credits, zero hallucination risk
   │  Miss ↓
   ▼
[Tier 2] Tavily RAG — search restricted to authoritative medical domains
   │  mayoclinic.org · nih.gov · medlineplus.gov · cdc.gov
   │  who.int · acog.org · plannedparenthood.org
   │  Hit: excerpts passed to Gemma 4 for synthesis
   │  Miss ↓
   ▼
[Tier 3] Gemma 4 (Cerebras) — direct generation with safety system prompt
   │
   ▼
Answer + disclaimer + source attribution
```

This layered design means Gemma's generative capability is only used when curated knowledge doesn't cover the question, and when it is used, it synthesizes from authoritative sources rather than generating freely.

### Document context flow

```
PDF upload
   │
   ▼
POST /api/explain/upload
   │  unpdf extracts text
   │  Gemma 4 → { summary, next_steps, questions, red_flags }
   ▼
Chat tab receives agent message with summary
   │
User follow-up question
   │
   ▼
POST /api/ask  { question, docContext: "<extracted explanation>" }
   │  Skips KB + RAG; Gemma answers from the document directly
   ▼
Answer grounded in the user's actual document
```

### Symptom structuring

`POST /api/symptoms` takes free-text symptom descriptions (accumulated from the chat conversation) and returns:

```json
{
  "summary": "Plain-language synthesis",
  "patterns": ["Observed patterns across symptoms"],
  "questions": ["What to ask your doctor"],
  "red_flags": ["Seek care immediately if..."],
  "urgency": "routine | soon | urgent",
  "bring_to_doctor": true
}
```

This is the core doctor-prep feature: turn 10 minutes of chat into a structured summary a clinician can act on in 30 seconds.

---

## Safety Design

Medical AI carries specific risks that generic chatbots don't. Every design decision here was made with that in mind:

- **Disclaimer is a constant** — defined once, imported everywhere. It cannot drift out of sync between endpoints.
- **KB answers describe, never conclude** — "this *can* mean X" not "you have X"
- **Emergency language is explicit in every prompt** — heavy bleeding, severe abdominal pain, signs of pregnancy complications always trigger a "seek care now" response, not general information
- **Document data never hits a database** — PDF text is extracted in-memory, passed to Gemma, and discarded. No storage, no logging of patient content.
- **Trusted domains only for RAG** — Tavily is restricted to 7 pre-approved medical authorities. No general web search.
- **WebLLM path for the privacy-sensitive** — users who don't want any data to leave their browser can use the on-device Gemma 2 2B version

---

## Tech Stack

**Backend**
- Node.js 20+ / Express 4 / ES modules
- Cerebras AI API → Gemma 4 31B
- Tavily Search API (restricted to authoritative medical domains)
- `unpdf` for PDF text extraction (pure ESM, no native binaries)
- `multer` for multipart file uploads

**Frontend**
- React 19 / TypeScript / Vite 8
- Tailwind CSS v4
- Proxy: Vite dev server → backend on `:8787`

**On-device version**
- `@mlc-ai/web-llm` with `gemma-2-2b-it-q4f16_1-MLC`
- WebGPU inference (Chrome 113+)
- COOP/COEP headers for SharedArrayBuffer

---

## Running Locally

```bash
# 1. Clone
git clone https://github.com/cgyh98/women-health-navigator.git
cd women-health-navigator

# 2. Backend
cd backend
cp .env.example .env
# Add your CEREBRAS_API_KEY and TAVILY_API_KEY to .env
npm install
node --env-file=.env src/server.js   # :8787

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev   # :5173  — proxies /api to :8787
```

Open http://localhost:5173

### .env.example
```
CEREBRAS_API_KEY=your_key_here
CEREBRAS_MODEL=gemma-4-31b
TAVILY_API_KEY=your_key_here
PORT=8787
CORS_ORIGIN=*
```

### On-device WebLLM version
```bash
cd webllm
npm install
npm run dev   # :5174  — first load downloads the model (~1.5GB)
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check + model info |
| `POST` | `/api/ask` | Answer a women's health question (3-tier pipeline) |
| `POST` | `/api/explain` | Explain a healthcare document (JSON text) |
| `POST` | `/api/explain/upload` | Explain a healthcare document (PDF upload) |
| `POST` | `/api/symptoms` | Structure symptom descriptions into a doctor-ready summary |
| `POST` | `/api/doctor-questions` | Generate questions to ask at an upcoming appointment |

### POST /api/ask
```json
// Request
{ "question": "string", "docContext": "string (optional)" }

// Response
{
  "source": "kb | rag | model | doc",
  "answer": "string",
  "sources": ["url"],
  "disclaimer": "string"
}
```

### POST /api/explain/upload
```
multipart/form-data, field: file (PDF, max 10MB)
```
```json
// Response
{
  "explanation": "string",
  "source": "gemma-4-31b"
}
```

### POST /api/symptoms
```json
// Request
{ "symptoms": "free text description" }

// Response
{
  "summary": "string",
  "patterns": ["string"],
  "questions": ["string"],
  "red_flags": ["string"],
  "urgency": "routine | soon | urgent",
  "bring_to_doctor": true,
  "disclaimer": "string"
}
```

---

## Project Structure

```
women-health-navigator/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/         ask.js · explain.js · upload.js · symptoms.js · doctorQuestions.js
│   │   ├── kb/             topics.js · match.js
│   │   ├── llm/            cerebrasClient.js · tavilyClient.js
│   │   └── prompts/        documentPrompt.js · qaPrompt.js · symptomsPrompt.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         Chat · Documents · Summary · Profile tabs
│   │   └── imports/        images / assets
│   ├── vite.config.ts
│   └── package.json
├── webllm/                 On-device Gemma 2 2B via WebGPU
├── notebook/               Kaggle submission notebook
└── data/                   Sample documents and questions for testing
```

---

## Kaggle Notebook

The Kaggle submission notebook (`notebook/womens-health-navigator.ipynb`) demonstrates the full pipeline end-to-end without the frontend:

1. Install `cerebras-cloud-sdk` and `tavily-python`
2. Build the curated knowledge base
3. Run the three-tier Q&A pipeline
4. Explain a synthetic medical document
5. Generate a symptom summary
6. Generate doctor questions
7. Demonstrate Spanish output
8. Benchmark inference speed

---

## What's Next

- **Session memory** — carry context across chat turns so Gemma can refer back to what was said earlier
- **Voice input** — the mic button in the UI is wired up but not yet connected to speech-to-text
- **Provider portal** — the "uploading as provider" flow in Documents would let a clinician pre-load context before an appointment
- **LiteRT path** — local device inference via Google's LiteRT runtime as an alternative to WebLLM for mobile
