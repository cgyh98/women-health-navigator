import { TOPICS } from "./topics.js";

export function matchTopics(question) {
  const q = question.toLowerCase();
  return TOPICS.filter((t) => t.keywords.some((k) => q.includes(k)));
}
