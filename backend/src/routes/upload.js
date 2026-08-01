import { Router } from "express";
import multer from "multer";
import { extractText } from "unpdf";
import { callCerebras } from "../llm/cerebrasClient.js";
import { DOCUMENT_SYSTEM_PROMPT, buildDocumentUserMessage } from "../prompts/documentPrompt.js";
import { stripFences } from "../lib/stripFences.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only PDF files are accepted"));
  },
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing required field: file (PDF)" });
  }

  const spanish = req.body.spanish === "true" || req.body.spanish === true;

  let extracted;
  try {
    const { text } = await extractText(new Uint8Array(req.file.buffer));
    extracted = Array.isArray(text) ? text.join("\n").trim() : text?.trim();
  } catch (err) {
    return res.status(422).json({ error: "Could not parse PDF", detail: err.message });
  }

  if (!extracted || extracted.length === 0) {
    return res.status(422).json({ error: "PDF appears to contain no extractable text (may be a scanned image)" });
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
      user: buildDocumentUserMessage(extracted, spanish),
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

// Handle multer errors (file type, size)
uploadRouter.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message });
});
