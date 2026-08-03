export async function callCerebras({ system, user, history = [], apiKey, model }) {
  const messages = [
    { role: "system", content: system },
    ...history,
    { role: "user", content: user },
  ];
  const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, stream: false, messages }),
  });
  if (!res.ok) throw new Error(`Cerebras request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
