export async function callGemma({ system, user, ollamaUrl, model }) {
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama request failed: ${await res.text()}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}
