import { Router } from "express";
import { callCerebras } from "../llm/cerebrasClient.js";
import { SYMPTOMS_SYSTEM_PROMPT, buildSymptomsUserMessage } from "../prompts/symptomsPrompt.js";
import { stripFences } from "../lib/stripFences.js";

export const symptomsRouter = Router();

const DISCLAIMER =
  "This is general educational information only, not a diagnosis or treatment plan. " +
  "Talk to a healthcare professional for personal advice.";

symptomsRouter.post("/", async (req, res) => {
  const { symptoms, context } = req.body;

  if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length === 0) {
    return res.status(400).json({ error: "Missing required field: symptoms" });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";

  if (!apiKey) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });
  }

  let raw;
  try {
    raw = await callCerebras({
      system: SYMPTOMS_SYSTEM_PROMPT,
      user: buildSymptomsUserMessage(symptoms, context),
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

  res.json({
    summary: parsed.summary ?? "",
    patterns: parsed.patterns ?? [],
    bring_to_doctor: parsed.bring_to_doctor ?? true,
    urgency: parsed.urgency ?? "routine",
    questions: parsed.questions ?? [],
    red_flags: parsed.red_flags ?? [],
    disclaimer: DISCLAIMER,
  });
});
