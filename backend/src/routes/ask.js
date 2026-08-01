import { Router } from "express";
import { matchTopics } from "../kb/match.js";
import { callCerebras } from "../llm/cerebrasClient.js";
import { searchTavily } from "../llm/tavilyClient.js";
import { QA_SYSTEM_PROMPT, QA_RAG_SYSTEM_PROMPT, QA_DOC_SYSTEM_PROMPT, buildRagUserMessage } from "../prompts/qaPrompt.js";
import { stripFences } from "../lib/stripFences.js";

export const askRouter = Router();

const DISCLAIMER =
  "This is general educational information only, not a diagnosis or treatment plan. " +
  "Talk to a healthcare professional for personal advice.";

askRouter.post("/", async (req, res) => {
  const { question, docContext } = req.body;

  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "Missing required field: question" });
  }

  // If a document context is present, skip KB/RAG and answer directly from the doc
  if (docContext && typeof docContext === "string" && docContext.trim().length > 0) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";
    if (!apiKey) return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });

    let raw;
    try {
      raw = await callCerebras({
        system: QA_DOC_SYSTEM_PROMPT,
        user: `Document:\n${docContext}\n\nQuestion: ${question}`,
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
    return res.json({ source: "doc", answer: parsed.answer ?? "", disclaimer: DISCLAIMER });
  }

  // Tier 1: KB — instant, deterministic, no credits
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
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "CEREBRAS_API_KEY not configured" });
  }

  // Tier 2: Tavily RAG — search authoritative medical sources (1 credit per call)
  let tavilyResults = [];
  if (tavilyKey) {
    try {
      tavilyResults = await searchTavily({ query: question, apiKey: tavilyKey });
    } catch {
      // Tavily failure is non-fatal — fall through to pure model
    }
  }

  const useRag = tavilyResults.length > 0;
  const systemPrompt = useRag ? QA_RAG_SYSTEM_PROMPT : QA_SYSTEM_PROMPT;
  const userMessage = useRag ? buildRagUserMessage(question, tavilyResults) : question;

  // Tier 3: Gemma 4 — synthesize from sources (RAG) or generate directly (fallback)
  let raw;
  try {
    raw = await callCerebras({ system: systemPrompt, user: userMessage, apiKey, model });
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
    source: useRag ? "rag" : "model",
    topic: null,
    answer: parsed.answer ?? "",
    sources: useRag ? (parsed.sources ?? tavilyResults.map((r) => r.url)) : [],
    disclaimer: DISCLAIMER,
  });
});
