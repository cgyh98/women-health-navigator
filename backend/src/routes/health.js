import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  const model = process.env.CEREBRAS_MODEL || "gemma-4-31b";
  const apiKey = process.env.CEREBRAS_API_KEY;

  let cerebrasStatus = "unconfigured";
  if (apiKey) {
    try {
      const r = await fetch("https://api.cerebras.ai/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      cerebrasStatus = r.ok ? "reachable" : "error";
    } catch {
      cerebrasStatus = "unreachable";
    }
  }

  res.json({ ok: true, cerebras: cerebrasStatus, model });
});
