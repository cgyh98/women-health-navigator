# Women's Health Navigator

AI-powered decision-support tool for understanding women's health documents and answering common questions. On-device via Ollama + Gemma — no data leaves your machine.

## Backend Quick Start

```bash
# 1. Install Ollama and pull the model
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma2:2b
ollama serve   # leave running in a separate terminal

# 2. Install dependencies and start the backend
cd backend
npm install
cp .env.example .env
npm run dev    # listens on :8787
```

## API Endpoints

- `POST /api/explain` — Summarize a healthcare document in plain language
- `POST /api/ask` — Answer a women's health question (KB-first, model fallback)
- `GET /api/health` — Health check

See `IMPLEMENTATION.md` for full API contracts and field details.

## Daytona Deployment

```bash
python3 -m venv daytona/.venv
source daytona/.venv/bin/activate
pip install -r daytona/requirements.txt
export DAYTONA_API_KEY=your_key
python daytona/create_sandbox.py <your-repo-url>
```

## Project Structure

```
backend/src/
  server.js          — Express app
  routes/            — explain, ask, health endpoints
  kb/                — Knowledge base topics + keyword matcher
  llm/               — Ollama fetch wrapper
  prompts/           — System prompts for Gemma
  lib/               — Utilities (stripFences)
data/
  sample-documents.md  — Synthetic docs for /api/explain testing
  sample-questions.md  — Questions for /api/ask testing
daytona/
  setup.sh             — Sandbox bootstrap script
  create_sandbox.py    — Sandbox provisioner
```
