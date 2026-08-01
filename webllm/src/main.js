import * as webllm from "@mlc-ai/web-llm";
import { matchTopic, DISCLAIMER } from "./kb.js";
import { DOCUMENT_SYSTEM_PROMPT, QA_SYSTEM_PROMPT, buildDocumentUserMessage } from "./prompts.js";

const MODEL_ID = "gemma-2-2b-it-q4f16_1-MLC";

let engine = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loadBtn = document.getElementById("load-btn");
const loadStatus = document.getElementById("load-status");
const loadProgress = document.getElementById("load-progress");

const explainText = document.getElementById("explain-text");
const explainBtn = document.getElementById("explain-btn");
const explainResult = document.getElementById("explain-result");
const explainTime = document.getElementById("explain-time");

const askText = document.getElementById("ask-text");
const askBtn = document.getElementById("ask-btn");
const askResult = document.getElementById("ask-result");
const askTime = document.getElementById("ask-time");

// ── Model loading ─────────────────────────────────────────────────────────────
loadBtn.addEventListener("click", async () => {
  loadBtn.disabled = true;
  loadStatus.textContent = "Downloading model (first load ~1.5 GB, cached after)…";
  loadProgress.style.display = "block";

  engine = await webllm.CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (p) => {
      loadStatus.textContent = p.text;
      loadProgress.value = p.progress * 100;
    },
  });

  loadStatus.textContent = `Model ready: ${MODEL_ID} — running on-device via WebGPU`;
  loadProgress.style.display = "none";
  explainBtn.disabled = false;
  askBtn.disabled = false;
});

// ── Strip JSON fences ─────────────────────────────────────────────────────────
function stripFences(text) {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : trimmed;
}

// ── /api/explain equivalent ───────────────────────────────────────────────────
explainBtn.addEventListener("click", async () => {
  const text = explainText.value.trim();
  if (!text) return;

  explainBtn.disabled = true;
  explainResult.textContent = "Thinking…";
  explainTime.textContent = "";
  const t0 = performance.now();

  try {
    const reply = await engine.chat.completions.create({
      messages: [
        { role: "system", content: DOCUMENT_SYSTEM_PROMPT },
        { role: "user", content: buildDocumentUserMessage(text) },
      ],
      temperature: 0.1,
    });

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    const parsed = JSON.parse(stripFences(reply.choices[0].message.content));

    explainResult.textContent = JSON.stringify(parsed, null, 2);
    explainTime.textContent = `${elapsed}s on-device (WebGPU)`;
  } catch (err) {
    explainResult.textContent = `Error: ${err.message}`;
  } finally {
    explainBtn.disabled = false;
  }
});

// ── /api/ask equivalent ───────────────────────────────────────────────────────
askBtn.addEventListener("click", async () => {
  const question = askText.value.trim();
  if (!question) return;

  askBtn.disabled = true;
  askResult.textContent = "Thinking…";
  askTime.textContent = "";
  const t0 = performance.now();

  // KB fast path — no model needed
  const match = matchTopic(question);
  if (match) {
    const elapsed = ((performance.now() - t0) / 1000).toFixed(3);
    askResult.textContent = JSON.stringify(
      { source: "kb", topic: match.id, answer: match.answer, disclaimer: DISCLAIMER },
      null, 2
    );
    askTime.textContent = `${elapsed}s (KB match — no model call)`;
    askBtn.disabled = false;
    return;
  }

  // Model fallback
  try {
    const reply = await engine.chat.completions.create({
      messages: [
        { role: "system", content: QA_SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      temperature: 0.1,
    });

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    const parsed = JSON.parse(stripFences(reply.choices[0].message.content));

    askResult.textContent = JSON.stringify(
      { source: "model (on-device)", topic: null, answer: parsed.answer, disclaimer: DISCLAIMER },
      null, 2
    );
    askTime.textContent = `${elapsed}s on-device (WebGPU)`;
  } catch (err) {
    askResult.textContent = `Error: ${err.message}`;
  } finally {
    askBtn.disabled = false;
  }
});
