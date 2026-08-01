import { Router } from "express";
import { matchTopics } from "../kb/match.js";
import { callGemma } from "../llm/ollamaClient.js";
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

  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.GEMMA_MODEL || "gemma2:2b";

  let raw;
  try {
    raw = await callGemma({
      system: QA_SYSTEM_PROMPT,
      user: question,
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

  res.json({
    source: "model",
    topic: null,
    answer: parsed.answer ?? "",
    disclaimer: DISCLAIMER,
  });
});
