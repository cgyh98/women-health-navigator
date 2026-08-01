# Women's Health Navigator — Implementation Spec (Person A: AI/agent track)

Scope: backend service, KB, Gemma prompts, Daytona deployment. Frontend (Person B) only appears here
as the two contracts it consumes.

---

## 1. Repo setup

Create the repo before writing any code — everything below assumes it exists.

```bash
# Option A: GitHub CLI
gh repo create women-health-navigator --private --clone
cd women-health-navigator

# Option B: manual
# 1. Create an empty repo on github.com (no README/license/gitignore, you'll add your own)
git init women-health-navigator
cd women-health-navigator
git remote add origin git@github.com:<your-org>/women-health-navigator.git
```

Add a `.gitignore` immediately (first commit):

```
node_modules/
.env
dist/
*.log
.DS_Store
```

First commit should just be the skeleton directories below (empty dirs won't track in git — add a
`.gitkeep` or the first real file per folder).

## 2. Repo structure

```
women-health-navigator/
├── README.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js               # express app, mounts routes
│       ├── routes/
│       │   ├── explain.js          # POST /api/explain (document mode)
│       │   ├── ask.js              # POST /api/ask (Q&A mode)
│       │   └── health.js           # GET /api/health
│       ├── kb/
│       │   ├── topics.js           # topic definitions (id, keywords, answer)
│       │   └── match.js            # keyword matching logic
│       ├── llm/
│       │   └── ollamaClient.js     # fetch wrapper around Ollama /api/chat
│       ├── prompts/
│       │   ├── documentPrompt.js
│       │   └── qaPrompt.js
│       └── lib/
│           └── stripFences.js      # strips ```json fences from model output
├── data/
│   ├── sample-documents.md         # synthetic documents for /api/explain testing
│   └── sample-questions.md         # questions for /api/ask testing (KB hits + fallback misses)
├── daytona/
│   ├── setup.sh                    # installs Ollama+Node, pulls model, starts backend
│   └── create_sandbox.py           # provisions the Daytona sandbox, prints preview URL
└── frontend/                       # Person B's scope, not detailed here
```

Everything under `backend/`, `data/`, and `daytona/` is Person A's scope.

## 3. Tech stack

- Node.js 20+, Express 4, ES modules (`"type": "module"` in package.json)
- Ollama running `gemma2:2b` (swap to `gemma2:9b` if quality needs it and time allows)
- No database, no auth — single-request, stateless endpoints
- Daytona for hosting the backend+Ollama pair during the demo (sandbox, not production infra)

## 4. Prerequisites

```bash
# Ollama (local dev)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma2:2b
ollama serve   # leave running in a separate terminal, listens on :11434

# Backend
cd backend
npm install
cp .env.example .env
npm run dev    # listens on :8787 by default
```

`.env.example`:

```
OLLAMA_URL=http://localhost:11434
GEMMA_MODEL=gemma2:2b
PORT=8787
CORS_ORIGIN=*
```

## 5. API contracts

These are fixed — do not change field names without telling Person B, the frontend is built against
these shapes.

### `POST /api/explain` (document mode)

Request:
```json
{ "text": "string, required", "spanish": false }
```

Response `200`:
```json
{
  "summary": "string",
  "next_steps": ["string"],
  "questions": ["string"],
  "red_flags": ["string"],
  "spanish": { "summary": "...", "next_steps": ["..."], "questions": ["..."], "red_flags": ["..."] }
}
```
`spanish` key only present if requested. Errors: `400` missing text, `502` model/Ollama failure
(includes `raw` field with unparsed model output for debugging), `500` other server errors.

### `POST /api/ask` (Q&A mode)

Request:
```json
{ "question": "string, required" }
```

Response `200`:
```json
{
  "source": "kb",
  "topic": "period-pain",
  "answer": "string",
  "disclaimer": "This is general educational information only, not a diagnosis or treatment plan. Talk to a healthcare professional for personal advice."
}
```
or, when no KB topic matches:
```json
{
  "source": "model",
  "topic": null,
  "answer": "string",
  "disclaimer": "..."
}
```
Errors: `400` missing question, `502`/`500` same as above.

### `GET /api/health`

```json
{ "ok": true, "ollama": "reachable", "model": "gemma2:2b" }
```

## 6. KB module (`kb/topics.js`, `kb/match.js`)

`topics.js` exports an array — this is the deterministic, zero-hallucination fast path. Keep answers
short, factual, and always paired with the disclaimer (disclaimer is appended in the route, not stored
per-topic, so it can't drift):

```js
export const TOPICS = [
  {
    id: "period-pain",
    keywords: ["cramp", "cramps", "period pain", "painful period", "dysmenorrhea"],
    answer:
      "Cramping during a period happens because the uterus contracts to shed its lining, and mild-to-moderate " +
      "pain is common. Rest, heat, hydration, and light movement help many people. Seek care if pain is severe, " +
      "suddenly worse than usual, occurs outside your period, or stops you from normal activities.",
  },
  {
    id: "pms",
    keywords: ["pms", "premenstrual"],
    answer:
      "PMS refers to mood changes, bloating, breast tenderness, cravings, or fatigue in the days before a period. " +
      "Cycle tracking, sleep, gentle exercise, and stress management can help. Severe mood changes, thoughts of " +
      "self-harm, or symptoms that disrupt daily life need professional support — not something to manage alone.",
  },
  {
    id: "irregular-period",
    keywords: ["late period", "missed period", "irregular period", "period is late"],
    answer:
      "A late or irregular period can come from stress, sudden weight change, intense exercise, illness, certain " +
      "medications, hormonal conditions, or pregnancy. If irregularity is frequent, periods stop for several " +
      "months, or pregnancy is possible, talk to a doctor or gynecologist.",
  },
  {
    id: "period-hygiene",
    keywords: ["pad", "tampon", "menstrual cup", "period hygiene"],
    answer:
      "Change pads, tampons, or cups regularly (roughly every 4-8 hours depending on the product), wash hands " +
      "before and after, and avoid douching or scented products internally — they can disrupt natural balance " +
      "and raise infection risk. Unusual odor, itching, or discomfort is worth mentioning to a doctor.",
  },
  {
    id: "pcos",
    keywords: ["pcos", "polycystic ovary"],
    answer:
      "PCOS is a hormonal condition that can cause irregular periods, acne, excess hair growth, and sometimes " +
      "difficulty conceiving. Only a doctor can diagnose it, using history, bloodwork, and often an ultrasound. " +
      "If you notice these symptoms together, a gynecologist or endocrinologist is the right next step.",
  },
  {
    id: "pregnancy-basics",
    keywords: ["pregnant", "pregnancy", "prenatal", "trimester"],
    answer:
      "Early pregnancy symptoms can include a missed period, nausea, fatigue, and breast tenderness — a home " +
      "test and follow-up with a clinician confirm it. Prenatal care (bloodwork, ultrasounds, regular checkups) " +
      "is important for monitoring both parent and baby. Seek care immediately for heavy bleeding, severe " +
      "abdominal pain, severe headache with vision changes or swelling, or reduced fetal movement.",
  },
  {
    id: "contraception-basics",
    keywords: ["birth control", "contraception", "iud", "the pill"],
    answer:
      "There are many contraception options (pills, IUDs, implants, barrier methods, etc.) with different " +
      "effectiveness, side effects, and suitability depending on health history. A doctor or nurse practitioner " +
      "can help match a method to your situation — this isn't something to choose from general information alone.",
  },
  {
    id: "menopause-basics",
    keywords: ["menopause", "perimenopause", "hot flash", "hot flashes"],
    answer:
      "Perimenopause and menopause can bring irregular periods, hot flashes, sleep changes, and mood shifts, " +
      "typically in your 40s-50s. Many symptoms are manageable with lifestyle changes or treatment a doctor can " +
      "discuss with you. Unusual bleeding after menopause has fully started should always be checked promptly.",
  },
];
```

`match.js`:

```js
import { TOPICS } from "./topics.js";

export function matchTopics(question) {
  const q = question.toLowerCase();
  return TOPICS.filter((t) => t.keywords.some((k) => q.includes(k)));
}
```

Route logic (`routes/ask.js`): call `matchTopics`, if any match, return the first match's `answer` with
`source: "kb"`. If none match, call Gemma with `qaPrompt.js` and return `source: "model"`. Always attach
the same disclaimer constant regardless of source.

## 7. Prompts

### `prompts/documentPrompt.js` — system prompt for `/api/explain`

```
You are Women's Health Navigator, a decision-support assistant that helps patients and caregivers
understand healthcare documents related to menstrual health, reproductive health, pregnancy, and
related care. You run entirely on-device; you never claim to send data anywhere.

You are NOT a clinician. You must never:
- diagnose a condition
- recommend or adjust treatment or medication
- give personalized medical advice
- claim certainty about what a symptom or result means

You must always:
- rewrite the input in plain, non-technical language (6th-8th grade reading level)
- preserve every concrete action item from the source text (dates, medication names/doses as written,
  phone numbers, appointment instructions)
- keep language concise: short sentences, no jargon, define any medical term you must keep
- end with a reminder to contact a clinician for medical decisions
- if the input contains no healthcare content, say so instead of inventing an answer
- flag pregnancy-related emergencies distinctly if present in the source text: heavy bleeding, severe
  abdominal pain, severe headache with vision changes or swelling, reduced fetal movement, fever

Return ONLY valid JSON matching this exact shape, no markdown fences, no commentary:

{
  "summary": "2-4 sentence plain-language summary",
  "next_steps": ["short action item", "..."],
  "questions": ["question the patient could ask their clinician", "..."],
  "red_flags": ["situation that means seek help now, empty array if none apply"]
}

If Spanish is requested, also include a "spanish" key with the same four fields translated naturally.
```

User message template: `Rewrite the following healthcare text. Language requested: {{LANG}}.\n\n---\n{{INPUT_TEXT}}\n---`

### `prompts/qaPrompt.js` — system prompt for the `/api/ask` model fallback

```
You are Women's Health Navigator, answering a question that did not match a known safe topic. Follow
the same rules as the fixed knowledge base: educational only, never diagnose, never prescribe or adjust
treatment, never claim certainty about symptoms. Keep the answer to 2-4 short sentences, plain language,
no jargon. If the question is not about menstrual, reproductive, pregnancy, or related health topics,
say so briefly instead of answering off-topic. If the question describes a possible emergency (heavy
bleeding, severe pain, signs of pregnancy complications), say clearly that this needs prompt medical
attention rather than general information.

Return ONLY valid JSON: { "answer": "string" }. No markdown fences, no commentary.
```

User message: the raw question text, unmodified.

## 8. `llm/ollamaClient.js`

Single wrapper both routes call, keeps the Ollama call shape in one place:

```js
export async function callGemma({ system, user, ollamaUrl, model }) {
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama request failed: ${await res.text()}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}
```

`lib/stripFences.js` — reuse as-is, Gemma sometimes wraps JSON in ` ```json ` fences despite instructions:

```js
export function stripFences(text) {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : trimmed;
}
```

## 9. Sample/test data

`data/sample-documents.md`: 5 synthetic, fabricated documents for `/api/explain` — OB/GYN referral,
prenatal/ultrasound prep, postpartum discharge note, PCOS workup referral, mammogram prep. Each must be
clearly synthetic (no real patient data).

`data/sample-questions.md`: two lists —
- KB-hit questions (one per topic in `topics.js`, to verify keyword matching works)
- Fallback questions (things that won't match any keyword, to verify the Gemma fallback path and its
  tone/safety match the KB answers)

Test both endpoints against every sample before considering the backend done:

```bash
curl -s localhost:8787/api/explain -H 'Content-Type: application/json' \
  -d '{"text": "<paste a sample document>"}' | jq

curl -s localhost:8787/api/ask -H 'Content-Type: application/json' \
  -d '{"question": "why are my periods so painful"}' | jq
```

## 10. Daytona deployment

`daytona/setup.sh` runs inside the sandbox: installs Ollama + Node if missing, pulls `GEMMA_MODEL`,
`npm install` in `backend/`, starts `ollama serve` and the backend as background processes, health-checks
`/api/health`.

`daytona/create_sandbox.py`: uses the Daytona Python SDK (`pip install daytona`, `export
DAYTONA_API_KEY=...`) to create a sandbox, clone this repo, run `setup.sh` in a session, and print a
signed preview URL for the backend port (`sandbox.create_signed_preview_url(port, expires_in_seconds=3600)`
— no auth headers needed, so the frontend can call it directly). Requires the repo pushed to git first;
run it as `python daytona/create_sandbox.py <repo-url>`.

Frontend build/dev then points `VITE_API_BASE` at the printed URL.

## 11. Safety implementation checklist

- [ ] Disclaimer text is a single constant, imported everywhere it's used — never inlined per-topic or
      per-prompt, so it can't drift out of sync.
- [ ] `/api/ask` always returns the disclaimer regardless of `source`.
- [ ] Document prompt explicitly separates "red flag" language from routine next steps — red flags should
      never be empty by default; only empty when the source text genuinely has no urgent content.
- [ ] Pregnancy-specific emergency symptoms (heavy bleeding, severe abdominal pain, severe headache with
      vision changes/swelling, reduced fetal movement, fever) are explicitly named in both prompts, not
      left to the model to infer.
- [ ] No endpoint accepts or logs anything resembling real patient identifiers — sample data only.
- [ ] KB answers describe, never conclude ("this can mean X" not "you have X").

## 12. Definition of done (Person A's scope)

- `/api/explain` and `/api/ask` both running locally against real Gemma output, verified against every
  file in `data/`.
- KB covers all 8 topics with correct keyword matching (no false negatives on the sample questions).
- Daytona sandbox reachable via signed preview URL, backend responds to `/api/health`.
- `.env.example` accurate and `README.md` in `backend/` has the 3-command local run instructions from
  section 4.
