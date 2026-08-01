import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.GEMMA_MODEL || "gemma2:2b";

  let ollamaStatus = "unreachable";
  try {
    const r = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) ollamaStatus = "reachable";
  } catch {
    // unreachable
  }

  res.json({ ok: true, ollama: ollamaStatus, model });
});
