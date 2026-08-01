import express from "express";
import cors from "cors";
import { explainRouter } from "./routes/explain.js";
import { uploadRouter } from "./routes/upload.js";
import { askRouter } from "./routes/ask.js";
import { symptomsRouter } from "./routes/symptoms.js";
import { doctorQuestionsRouter } from "./routes/doctorQuestions.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Women's Health Navigator API",
    model: process.env.CEREBRAS_MODEL || "gemma-4-31b",
    endpoints: {
      "GET  /api/health": "health check",
      "POST /api/explain": "explain a healthcare document (JSON text)",
      "POST /api/explain/upload": "explain a healthcare document (PDF upload)",
      "POST /api/ask": "answer a women's health question",
      "POST /api/symptoms": "structure symptoms into a doctor-ready summary",
      "POST /api/doctor-questions": "generate questions to ask at an appointment",
    },
  });
});

app.use("/api/explain", explainRouter);
app.use("/api/explain/upload", uploadRouter);
app.use("/api/ask", askRouter);
app.use("/api/symptoms", symptomsRouter);
app.use("/api/doctor-questions", doctorQuestionsRouter);
app.use("/api/health", healthRouter);

app.listen(PORT, () => {
  console.log(`Women's Health Navigator backend running on port ${PORT}`);
});
