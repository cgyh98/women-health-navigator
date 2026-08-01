import { Router } from "express";
import { callCerebras } from "../llm/cerebrasClient.js";
import { DOCUMENT_SYSTEM_PROMPT, buildDocumentUserMessage } from "../prompts/documentPrompt.js";
import { stripFences } from "../lib/stripFences.js";

export const explainRouter = Router();

explainRouter.post("/", async (req, res) => {
  const { text, spanish = false } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing required field: text" });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";

  if (!apiKey) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });
  }

  let raw;
  try {
    raw = await callCerebras({
      system: DOCUMENT_SYSTEM_PROMPT,
      user: buildDocumentUserMessage(text, spanish),
      apiKey,
      model,
    });
  } catch (err) {
    return res.status(502).json({ error: "Cerebras API failure", detail: err.message });
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
