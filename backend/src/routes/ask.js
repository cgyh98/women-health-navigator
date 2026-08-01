import { Router } from "express";
import { matchTopics } from "../kb/match.js";
import { callCerebras } from "../llm/cerebrasClient.js";
import { QA_SYSTEM_PROMPT } from "../prompts/qaPrompt.js";
import { stripFences } from "../lib/stripFences.js";

export const askRouter = Router();

const DISCLAIMER =
  "This is general educational information only, not a diagnosis or treatment plan. " +
  "Talk to a healthcare professional for personal advice.";

askRouter.post("/", async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "Missing required field: question" });
  }

  const matches = matchTopics(question);

  if (matches.length > 0) {
    return res.json({
      source: "kb",
      topic: matches[0].id,
      answer: matches[0].answer,
      disclaimer: DISCLAIMER,
    });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";

  if (!apiKey) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });
  }

  let raw;
  try {
    raw = await callCerebras({
      system: QA_SYSTEM_PROMPT,
      user: question,
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
    source: "model",
    topic: null,
    answer: parsed.answer ?? "",
    disclaimer: DISCLAIMER,
  });
});
