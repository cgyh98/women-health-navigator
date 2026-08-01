import { Router } from "express";
import { callCerebras } from "../llm/cerebrasClient.js";
import { DOCTOR_QUESTIONS_SYSTEM_PROMPT, buildDoctorQuestionsUserMessage } from "../prompts/doctorQuestionsPrompt.js";
import { stripFences } from "../lib/stripFences.js";

export const doctorQuestionsRouter = Router();

const DISCLAIMER =
  "This is general educational information only, not a diagnosis or treatment plan. " +
  "Talk to a healthcare professional for personal advice.";

doctorQuestionsRouter.post("/", async (req, res) => {
  const { context, concerns } = req.body;

  if (!context || typeof context !== "string" || context.trim().length === 0) {
    return res.status(400).json({ error: "Missing required field: context" });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";

  if (!apiKey) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });
  }

  let raw;
  try {
    raw = await callCerebras({
      system: DOCTOR_QUESTIONS_SYSTEM_PROMPT,
      user: buildDoctorQuestionsUserMessage(context, concerns),
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
    questions: parsed.questions ?? [],
    topics: parsed.topics ?? [],
    disclaimer: DISCLAIMER,
  });
});
