import { Router } from "express";
import { callGemma } from "../llm/ollamaClient.js";
import { DOCUMENT_SYSTEM_PROMPT, buildDocumentUserMessage } from "../prompts/documentPrompt.js";
import { stripFences } from "../lib/stripFences.js";

export const explainRouter = Router();

explainRouter.post("/", async (req, res) => {
  const { text, spanish = false } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing required field: text" });
  }

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.GEMMA_MODEL || "gemma2:2b";

  let raw;
  try {
    raw = await callGemma({
      system: DOCUMENT_SYSTEM_PROMPT,
      user: buildDocumentUserMessage(text, spanish),
      ollamaUrl,
      model,
    });
  } catch (err) {
    return res.status(502).json({ error: "Model or Ollama failure", detail: err.message });
  }

  let parsed;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return res.status(502).json({ error: "Failed to parse model output", raw });
  }

  const response = {
    summary: parsed.summary ?? "",
    next_steps: parsed.next_steps ?? [],
    questions: parsed.questions ?? [],
    red_flags: parsed.red_flags ?? [],
  };

  if (spanish && parsed.spanish) {
    response.spanish = parsed.spanish;
  }

  res.json(response);
});
