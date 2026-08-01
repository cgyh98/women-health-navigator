// Authoritative women's health sources only — no general web results
const TRUSTED_DOMAINS = [
  "mayoclinic.org",
  "nih.gov",
  "medlineplus.gov",
  "cdc.gov",
  "who.int",
  "acog.org",
  "plannedparenthood.org",
];

export async function searchTavily({ query, apiKey, maxResults = 3 }) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic", // 1 credit per call (not 2 for advanced)
      include_domains: TRUSTED_DOMAINS,
      max_results: maxResults,
    }),
  });
  if (!res.ok) throw new Error(`Tavily request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.results ?? [];
}
