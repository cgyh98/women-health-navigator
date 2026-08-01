import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@mlc-ai/web-llm"],
  },
  server: {
    port: 5173,
    headers: {
      // Required for SharedArrayBuffer used by WebLLM
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
