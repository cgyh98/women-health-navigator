import express from "express";
import cors from "cors";
import { explainRouter } from "./routes/explain.js";
import { askRouter } from "./routes/ask.js";
import { healthRouter } from "./routes/health.js";

const app = express();
const PORT = process.env.PORT || 8787;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use("/api/explain", explainRouter);
app.use("/api/ask", askRouter);
app.use("/api/health", healthRouter);

app.listen(PORT, () => {
  console.log(`Women's Health Navigator backend running on port ${PORT}`);
});
