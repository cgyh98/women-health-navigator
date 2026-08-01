# Kaggle Submission — Women's Health Navigator

> Copy this into the Kaggle project description field. The notebook covers the technical demo; this covers the framing, architecture, and design rationale.

---

## Project Title
**Women's Health Navigator** — AI-powered health companion for understanding medical documents and preparing for doctor visits

## One-line Description
A three-tier Gemma 4 pipeline that reads your medical documents, answers women's health questions grounded in Mayo Clinic / NIH / CDC sources, and builds a structured symptom summary ready to hand to a doctor.

---

## Problem Statement

Women face a specific, recurring gap in healthcare: they leave appointments with documents they can't parse, questions they forgot to ask, and symptoms they don't know how to describe. This isn't a literacy problem — it's a translation problem between clinical language and plain English.

Existing tools either require a subscription, transmit data to opaque servers, or give generic advice that ignores the actual document in front of you. None of them close the loop between "I have this discharge note" and "here is what I need to do next."

Women from lower-income backgrounds and non-English-speaking communities face this gap most acutely. A tool that works on-device, requires no account, and outputs in both English and Spanish is not a nice-to-have — it's an equity question.

---

## Solution

Women's Health Navigator is a mobile-first app with three core capabilities:

**1. Document Intelligence**
Upload a PDF (lab results, discharge note, referral letter, prenatal instructions). Gemma 4 rewrites it at a 6th–8th grade reading level and returns:
- Plain-language summary
- Concrete next steps (preserving dates, phone numbers, medication names)
- Questions to ask at the follow-up appointment
- Red flags that mean "seek care now"

After upload, the chat tab becomes document-aware. Follow-up questions like "what does this say about my iron?" are answered from the actual document, not from generic training data.

**2. Three-Tier Q&A**
Every health question goes through three tiers in order, stopping at the first that can answer it:

- **Tier 1 — Knowledge Base**: 8 curated women's health topics (period pain, PMS, PCOS, pregnancy, contraception, menopause, and more) answered from fixed, vetted text. Zero API calls, zero hallucination risk on the topics that matter most.
- **Tier 2 — Tavily RAG**: If no KB match, search is run against 7 pre-approved authoritative domains only (mayoclinic.org, nih.gov, medlineplus.gov, cdc.gov, who.int, acog.org, plannedparenthood.org). Gemma 4 synthesizes from the retrieved excerpts and returns citations.
- **Tier 3 — Gemma 4 direct**: If RAG returns nothing, Gemma answers with a safety-first system prompt that prohibits diagnosis, treatment recommendations, and certainty claims.

**3. Symptom Structuring**
As the user describes symptoms in natural chat, a Summary tab grows in real time. After two or more exchanges, the app calls a structured endpoint that returns: symptom patterns, urgency level (routine / soon / urgent), questions to ask the provider, and red flags. The output is designed to be handed to a clinician — it summarizes in 30 seconds what took 10 minutes to describe.

---

## Gemma 4 Architecture

### Model usage
The primary demo path uses **Gemma 4 31B via Cerebras** — inference at ~0.5–1s per call. A second version uses **Gemma 2 2B via WebLLM** (WebGPU, in-browser) for users who require zero data transmission.

Gemma 4 is used for four distinct tasks, each with a purpose-built system prompt:

| Task | Prompt strategy |
|---|---|
| Document rewriting | Long system prompt with explicit output schema + red flag enumeration |
| RAG synthesis | Strict "use only the provided excerpts" constraint + citation requirement |
| Q&A fallback | Conservative tone prompt: describe, never conclude; emergency escalation |
| Document Q&A | Grounded in extracted document text, bypasses KB and RAG entirely |
| Symptom structuring | Returns `{ summary, patterns, urgency, questions, red_flags }` |

### Why this architecture handles medical content safely

Medical AI has failure modes that generic chatbots don't — a wrong answer can delay care or create false reassurance. Every design decision here was made with that in mind:

- The disclaimer is a **single constant**, imported everywhere. It cannot drift.
- KB answers **describe, never conclude** — "this can mean X" not "you have X"
- Pregnancy emergency symptoms are **explicitly enumerated in every prompt**, not left to model inference
- RAG is restricted to **7 pre-approved domains** — no general web search that could surface low-quality sources
- Document content is processed **in-memory only** — no storage, no logging of patient content
- The WebLLM path gives privacy-critical users a path where **zero data leaves the browser**

---

## Technical Implementation

**Backend** — Node.js 20 / Express 4 / ES modules
- `POST /api/ask` — three-tier Q&A pipeline
- `POST /api/explain/upload` — PDF upload → `unpdf` extraction → Gemma 4 rewrite
- `POST /api/symptoms` — free-text symptoms → structured doctor-ready summary
- `POST /api/doctor-questions` — appointment context → questions to ask

**Frontend** — React 19 / TypeScript / Vite 8 / Tailwind CSS v4
- Chat tab: real-time Q&A with Gemma 4
- Documents tab: PDF upload with inline AI summary + automatic chat context injection
- Summary tab: living symptom summary built from the conversation
- Vite dev proxy routes `/api` to the backend

**On-device version** — `@mlc-ai/web-llm`, `gemma-2-2b-it-q4f16_1-MLC`, WebGPU
- Same KB, same prompts, same output schema
- No backend required — runs entirely in Chrome 113+
- First load downloads the model (~1.5GB); subsequent loads use browser cache

---

## Demo Flow

1. Open http://localhost:5173
2. Tap **Get Started**
3. **Documents tab** → upload any PDF medical document → watch Gemma 4 summarize it in ~1s → app auto-switches to Chat with the summary as context
4. Ask a follow-up question in Chat: *"What should I do about the iron levels?"*
5. Ask a general question: *"What causes irregular periods?"* (KB instant answer) or *"How does endometriosis affect fertility?"* (RAG answer from Mayo Clinic)
6. Describe symptoms over several messages → switch to **Summary tab** → structured doctor-ready summary appears

---

## What's Missing (Honest Limitations)

- **No session memory across turns** — the chat context is not currently passed back into `/api/ask` for multi-turn conversation. Each message is independent.
- **WebLLM has no Gemma 4** — the on-device version uses Gemma 2 2B because `@mlc-ai/web-llm` doesn't yet ship a Gemma 4 MLC build. The Cerebras path satisfies the Gemma 4 requirement.
- **Voice input UI is wired but not connected** — the mic button exists; speech-to-text is not implemented.
- **No real persistence** — documents and chat history reset on page reload.

---

## Repository
https://github.com/cgyh98/women-health-navigator

**To run:**
```bash
git clone https://github.com/cgyh98/women-health-navigator.git
cd women-health-navigator/backend && npm install
# set CEREBRAS_API_KEY + TAVILY_API_KEY in .env
node --env-file=.env src/server.js

# separate terminal
cd ../frontend && npm install && npm run dev
# open http://localhost:5173
```
