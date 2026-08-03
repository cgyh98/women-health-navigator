import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api";
import slide1Img from "@/imports/image-2.png";
import slide2Img from "@/imports/image-1.png";
import slide3Img from "@/imports/image.png";
import logoWordmark from "@/imports/Screenshot_2026-08-01_at_1.48.38_PM.png";
import logoIcon from "@/imports/Screenshot_2026-08-01_at_1.47.43_PM.png";

const paths = {
  chat: "M21 11.5a8.4 8.4 0 0 1-8.9 8.4 9 9 0 0 1-3.6-.7L3 20l1.05-4.5A8.4 8.4 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z",
  doc: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M9 13h6M9 17h6M9 9h1",
  summary: "M4 6h16M4 12h16M4 18h7",
  profile: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM4 21c1.4-4 4.7-6 8-6s6.6 2 8 6",
  send: "m5 12 14-8-6 16-2-7-6-1Z",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-7-3a7 7 0 0 0 14 0M12 19v3",
  plus: "M12 5v14M5 12h14",
  chevron: "m9 6 6 6-6 6",
  export: "M12 3v12m0-12 4 4m-4-4-4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3",
  trash: "M4 7h16M9 7V4h6v3m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13",
  score: "M12 2a10 10 0 1 0 10 10M12 2a10 10 0 0 1 8.7 5",
  bell: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 20a2 2 0 0 0 4 0",
  globe: "M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20M2 12h20M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
  voice: "M9 9a3 3 0 0 1 6 0v2a3 3 0 1 1-6 0V9Z",
  flag: "M5 21V4l14 4-14 4",
  alert: "M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  check: "m5 13 4 4L19 7",
  clipboard: "M9 3h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V4a1 1 0 0 1 1-1ZM9 11h6M9 15h6",
};

function Icon({ name, ...props }: { name: keyof typeof paths; [key: string]: unknown }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={(paths as Record<string, string>)[name]} />
    </svg>
  );
}

function AgentMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className={`agent-mark ${size}`}>
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="7" stroke="#fff" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.4" fill="#fff" />
      </svg>
    </div>
  );
}

const openingMessage =
  "Hi, I'm here to help you make sense of what's going on. What's been on your mind about your health today?";

const agentTurns = [
  "Thanks for telling me that. How long has this been going on?",
  "Got it — and on a scale from mild to severe, how would you describe it right now?",
  "That's helpful. Have you noticed any fever, unusual bleeding, or pain that's gotten worse instead of better?",
  "One more thing — are you currently taking any medications or supplements for this?",
  "Thank you for walking me through all of that. I've put together a summary on the Summary tab, and I have a question worth bringing to your provider.",
];

const QUESTIONS_BEFORE_NUDGE = 5;

function nextAgentMessage(turnIndex: number) {
  return agentTurns[Math.min(turnIndex, agentTurns.length - 1)];
}

function shouldShowProviderNudge(userMessageCount: number) {
  return userMessageCount === QUESTIONS_BEFORE_NUDGE;
}

const providerNudge = {
  question:
    "Given how long these symptoms have lasted, should we be checking for anything beyond the usual explanation?",
  context:
    "Based on what you've shared, this is a specific, useful question to bring to your next visit.",
};

const summaryStages = [
  null,
  {
    summary: "You're describing symptoms that started recently. I'm gathering a bit more detail before putting together next steps.",
    next_steps: [],
    questions: [],
    red_flags: [],
  },
  {
    summary: "Based on what you've shared so far, this sounds like a manageable, common concern — I'll keep refining this as we talk.",
    next_steps: ["Keep a simple log of when symptoms happen and how severe they feel."],
    questions: [],
    red_flags: [],
  },
  {
    summary: "This sounds like a common concern that's worth mentioning at your next visit, but nothing you've described so far sounds urgent.",
    next_steps: [
      "Keep a simple log of when symptoms happen and how severe they feel.",
      "Note anything that seems to trigger or worsen it.",
    ],
    questions: ["Is this something that usually resolves on its own, or should I be treating it?"],
    red_flags: [
      "Fever over 100.4°F",
      "Bleeding that soaks through a pad or tampon in under an hour",
      "Pain that suddenly becomes severe or one-sided",
    ],
  },
  {
    summary: "Here's where things stand: your symptoms sound consistent with a common, non-urgent issue, and nothing you've described points to an emergency.",
    next_steps: [
      "Keep a simple log of when symptoms happen and how severe they feel.",
      "Note anything that seems to trigger or worsen it.",
      "Mention any current medications or supplements at your next visit.",
    ],
    questions: [
      "Is this something that usually resolves on its own, or should I be treating it?",
      "Could my current medication be contributing to this?",
    ],
    red_flags: [
      "Fever over 100.4°F",
      "Bleeding that soaks through a pad or tampon in under an hour",
      "Pain that suddenly becomes severe or one-sided",
    ],
  },
  {
    summary: "Here's where things stand: your symptoms sound consistent with a common, non-urgent issue, and nothing you've described points to an emergency.",
    next_steps: [
      "Keep a simple log of when symptoms happen and how severe they feel.",
      "Note anything that seems to trigger or worsen it.",
      "Mention any current medications or supplements at your next visit.",
      "Bring the question below to your appointment.",
    ],
    questions: [
      "Is this something that usually resolves on its own, or should I be treating it?",
      "Could my current medication be contributing to this?",
      providerNudge.question,
    ],
    red_flags: [
      "Fever over 100.4°F",
      "Bleeding that soaks through a pad or tampon in under an hour",
      "Pain that suddenly becomes severe or one-sided",
    ],
  },
];

function buildSummary(userMessageCount: number) {
  const stage = Math.min(userMessageCount, summaryStages.length - 1);
  return summaryStages[stage];
}

const totalStages = summaryStages.length - 1;

function PhoneFrame({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="page-shell">
      <div className="phone-frame">
        <div className="status-bar">
          <div className="dynamic-island" />
          <span>9:41</span>
          <div className="status-icons">
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              <rect x="0" y="6" width="2.5" height="5" rx="0.6" fill="currentColor" />
              <rect x="4" y="4" width="2.5" height="7" rx="0.6" fill="currentColor" />
              <rect x="8" y="2" width="2.5" height="9" rx="0.6" fill="currentColor" />
              <rect x="12" y="0" width="2.5" height="11" rx="0.6" fill="currentColor" />
            </svg>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <path
                d="M7.5 2.2c2.4 0 4.6.9 6.2 2.5l-1.4 1.5a6.4 6.4 0 0 0-9.6 0L1.3 4.7A8.7 8.7 0 0 1 7.5 2.2Zm0 3.4c1.3 0 2.4.5 3.3 1.3l-1.4 1.5a2.6 2.6 0 0 0-3.8 0L4.2 6.9a4.6 4.6 0 0 1 3.3-1.3Z"
                fill="currentColor"
              />
            </svg>
            <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
              <rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="currentColor" />
              <rect x="2" y="2" width="15" height="7" rx="1.3" fill="currentColor" />
              <rect x="19.5" y="3.5" width="1.6" height="4" rx="0.8" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div className="screen-body">{children}</div>
        {footer}
      </div>
    </div>
  );
}

const tabs = [
  { id: "chat", label: "Assistant", icon: "chat" },
  { id: "documents", label: "Documents", icon: "doc" },
  { id: "summary", label: "Summary", icon: "clipboard" },
  { id: "profile", label: "Profile", icon: "profile" },
] as const;

function BottomNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`nav-item ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
          type="button"
        >
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---- Onboarding slides — purple-to-peach palette from the actual designs ---- */
const slides = [
  {
    gradient: "linear-gradient(175deg, #b8a8d4 0%, #c9afc8 40%, #f0c8a8 100%)",
    img: slide1Img,
    eyebrow: "Say what's going on",
    bold: "In your own words.",
    sub: "Talk it through like you would with a friend. Nest listens and helps you make sense of it.",
  },
  {
    gradient: "linear-gradient(175deg, #b0a0cc 0%, #c4a8c8 40%, #f0c4a4 100%)",
    img: slide2Img,
    eyebrow: "Nothing leaves this phone",
    bold: "Private by design.",
    sub: "Everything you share is processed right here, on-device — never uploaded, never shared.",
  },
  {
    gradient: "linear-gradient(175deg, #b8a8d0 0%, #c8aac4 40%, #f2caa8 100%)",
    img: slide3Img,
    eyebrow: "Walk in prepared",
    bold: "Ready for your visit.",
    sub: "Nest turns your conversation into a summary and the right question to ask your provider.",
  },
];


function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  return (
    <div className="onboard-screen">
      <div className="onboard-header">
        <img src={logoWordmark} alt="Nest" className="onboard-wordmark-img" />
      </div>
      <div className="onboard-hero" style={{ background: slide.gradient }}>
        <div className="grain" />
        <div className="onboard-illustration">
          <img src={slide.img} alt={slide.bold} className="onboard-slide-img" />
        </div>
      </div>

      <div className="onboard-sheet">
        <div className="onboard-copy">
          <p className="eyebrow-line">{slide.eyebrow}</p>
          <p className="bold-line">{slide.bold}</p>
          <p className="subtext">{slide.sub}</p>
        </div>

        <div className="onboard-footer">
          <div className="dot-pagination">
            {slides.map((_, i) => (
              <span key={i} className={i === index ? "active" : ""} />
            ))}
          </div>

          <div className="onboard-nav-btns">
            <button
              className="nav-circle-btn"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              type="button"
              aria-label="Previous"
            >
              <Icon name="chevron" width={16} height={16} style={{ transform: "rotate(180deg)" }} />
            </button>

            {isLast ? (
              <button className="nav-pill-btn" onClick={onGetStarted} type="button">
                Begin journey
                <Icon name="chevron" width={16} height={16} />
              </button>
            ) : (
              <button className="nav-pill-btn" onClick={() => setIndex((i) => i + 1)} type="button">
                Next
                <Icon name="chevron" width={16} height={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const STARTER_PROMPTS = [
  "My period has been irregular",
  "I have pain that won't go away",
  "Questions about my discharge papers",
];

const AGENT_TYPING_MS = 900;

interface Message {
  role: "agent" | "user";
  text: string;
}

function ChatScreen({
  messages,
  setMessages,
  userTurnCount,
  setUserTurnCount,
  showNudge,
  setShowNudge,
  docContext,
  lang,
}: {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  userTurnCount: number;
  setUserTurnCount: React.Dispatch<React.SetStateAction<number>>;
  showNudge: boolean;
  setShowNudge: React.Dispatch<React.SetStateAction<boolean>>;
  docContext: string;
  lang: string;
}) {
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setTyping(true);
      const t = setTimeout(() => {
        setMessages([{ role: "agent", text: openingMessage }]);
        setTyping(false);
      }, 500);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, showNudge]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || typing) return;
    const newUserCount = userTurnCount + 1;
    setMessages((m) => [...m, { role: "user", text: value }]);
    setUserTurnCount(newUserCount);
    setDraft("");
    setTyping(true);
    try {
      // Build history from prior messages (skip the opening greeting, keep last 10 turns)
      const history = messages
        .filter((m) => m.text !== openingMessage)
        .slice(-10)
        .map((m) => ({ role: m.role === "agent" ? "assistant" : "user", content: m.text }));

      const body: Record<string, unknown> = { question: value, history, lang };
      if (docContext) body.docContext = docContext;
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const reply = data.answer ?? data.error ?? "I'm not sure — please try again.";
      setMessages((m) => [...m, { role: "agent", text: reply }]);
      if (shouldShowProviderNudge(newUserCount)) setShowNudge(true);
    } catch {
      setMessages((m) => [...m, { role: "agent", text: "I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <h2 className="greeting">
          Hi, <em>Maya</em>
        </h2>
      </div>

      <div className="chat-thread" ref={threadRef}>
        {messages.length === 0 && !typing && (
          <div className="chat-empty">
            <img src={logoIcon} alt="Nest" className="agent-bird agent-bird-md" />
            <p className="subtext" style={{ margin: 0 }}>Nest is ready to listen.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div className={`bubble-row ${m.role}`} key={i}>
            {m.role === "agent" && <img src={logoIcon} alt="Nest" className="agent-bird agent-bird-sm" />}
            <div className="bubble">{m.text}</div>
          </div>
        ))}
        {typing && (
          <div className="bubble-row agent">
            <img src={logoIcon} alt="Nest" className="agent-bird agent-bird-sm" />
            <div className="bubble">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}
        {showNudge && (
          <div className="provider-nudge">
            <div className="nudge-label">
              <Icon name="flag" width={13} height={13} />
              Ask your provider
            </div>
            <p>{providerNudge.question}</p>
            <p className="nudge-sub">{providerNudge.context}</p>
          </div>
        )}
      </div>

      {messages.length <= 1 && !typing && (
        <div className="quick-replies">
          {STARTER_PROMPTS.map((p) => (
            <button key={p} className="quick-chip" onClick={() => send(p)} type="button">
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-bar">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !typing && send(draft)}
          placeholder={typing ? "Nest is thinking…" : "Type how you're feeling…"}
          disabled={typing}
        />
        <button className="icon-btn" type="button" aria-label="Voice input" disabled={typing}>
          <Icon name="mic" />
        </button>
        <button
          className="icon-btn"
          type="button"
          onClick={() => send(draft)}
          disabled={!draft.trim() || typing}
          aria-label="Send"
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}

interface Doc {
  id: string;
  name: string;
  source: "you" | "provider";
  pages: number;
  date: string;
  summary?: string;
  next_steps?: string[];
  questions?: string[];
  red_flags?: string[];
  loading?: boolean;
}

function DocumentsScreen({
  docs,
  setDocs,
  setMessages,
  setDocContext,
  onGoToChat,
  lang,
}: {
  docs: Doc[];
  setDocs: React.Dispatch<React.SetStateAction<Doc[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setDocContext: React.Dispatch<React.SetStateAction<string>>;
  onGoToChat: () => void;
  lang: string;
}) {
  const [source, setSource] = useState<"you" | "provider">("you");
  const fileRef = useRef<HTMLInputElement>(null);

  interface DocResult {
    summary?: string;
    next_steps?: string[];
    questions?: string[];
    red_flags?: string[];
    error?: string;
  }

  async function uploadDoc(file: File): Promise<DocResult | undefined> {
    const form = new FormData();
    form.append("file", file);
    if (lang === "es") form.append("spanish", "true");
    try {
      const res = await fetch(`${API_BASE}/explain/upload`, { method: "POST", body: form });
      return await res.json();
    } catch {
      return undefined;
    }
  }

  async function addDocs(fileList: FileList | null) {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const additions: Doc[] = files.map((f) => ({
      id: `${Date.now()}-${f.name}`,
      name: f.name,
      source,
      pages: Math.max(1, Math.round(f.size / 50000)),
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
      loading: true,
    }));
    setDocs((d) => [...additions, ...d]);
    for (const [i, file] of files.entries()) {
      const result = await uploadDoc(file);
      const id = additions[i].id;
      setDocs((d) =>
        d.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                loading: false,
                summary: result?.summary,
                next_steps: result?.next_steps,
                questions: result?.questions,
                red_flags: result?.red_flags,
              }
            : doc
        )
      );
      if (result?.summary) {
        const parts = [result.summary];
        if (result.next_steps?.length) parts.push("Next steps:\n" + result.next_steps.map((s) => `• ${s}`).join("\n"));
        if (result.questions?.length) parts.push("Questions to ask your doctor:\n" + result.questions.map((q) => `• ${q}`).join("\n"));
        if (result.red_flags?.length) parts.push("⚠️ Seek care if:\n" + result.red_flags.map((f) => `• ${f}`).join("\n"));
        const fullText = parts.join("\n\n");
        setDocContext(fullText);
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            text: `I've read your document "${file.name}".\n\n${fullText}\n\nFeel free to ask me any questions about it.`,
          },
        ]);
        // Stay on Documents tab so user can read the summary — chat is ready when they switch
      }
    }
  }

  return (
    <div className="screen-pad">
      <p className="eyebrow">My medical documents</p>
      <h2 className="headline">Give Nest some context</h2>
      <p className="subtext">Upload a discharge note, chart, or history. Your provider can add records too — everything stays on this device.</p>
      <div className="doc-source-toggle" style={{ marginTop: 18 }}>
        <button className={source === "you" ? "active" : ""} onClick={() => setSource("you")} type="button">Uploading as you</button>
        <button className={source === "provider" ? "active" : ""} onClick={() => setSource("provider")} type="button">Uploading as provider</button>
      </div>
      <div className="upload-zone" onClick={() => fileRef.current?.click()}>
        <div className="plus"><Icon name="plus" /></div>
        <h4>Upload document</h4>
        <p>Medical reports, lab results, or prescriptions</p>
        <div className="upload-types">
          <span>PDF</span><span>Images</span><span>Text</span>
        </div>
        <input ref={fileRef} type="file" multiple accept=".pdf" hidden onChange={(e) => addDocs(e.target.files)} />
      </div>
      {docs.length === 0 ? (
        <div className="doc-empty">No documents yet — add one above.</div>
      ) : (
        <div className="doc-list">
          {docs.map((d) => (
            <div className="card doc-card" key={d.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <div className="doc-icon"><Icon name="doc" /></div>
                <div className="doc-meta">
                  <p className="doc-name">{d.name}</p>
                  <p className="doc-sub">
                    <span className={`source-tag ${d.source}`}>{d.source === "you" ? "You" : "Provider"}</span>
                    {d.pages} page{d.pages > 1 ? "s" : ""} · {d.date}
                  </p>
                </div>
              </div>
              {d.loading && <p style={{ fontSize: "0.8rem", color: "var(--ink-faint)", margin: 0 }}>Analyzing document…</p>}
              {d.summary && !d.loading && (
                <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{d.summary}</p>
              )}
              {!d.loading && (d.next_steps?.length ?? 0) > 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  <strong>Next steps:</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                    {d.next_steps!.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {!d.loading && (d.red_flags?.length ?? 0) > 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--coral)" }}>
                  <strong>⚠️ Seek care if:</strong>
                  <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                    {d.red_flags!.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
              {!d.loading && d.summary && (
                <button
                  type="button"
                  onClick={onGoToChat}
                  style={{
                    alignSelf: "flex-start", marginTop: 4,
                    background: "var(--lavender)", color: "#fff",
                    border: "none", borderRadius: "var(--radius-sm)",
                    padding: "7px 14px", fontSize: "0.78rem", fontWeight: 700,
                    fontFamily: "var(--sans)", cursor: "pointer",
                  }}
                >
                  Ask questions in chat →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SummaryData {
  summary: string;
  next_steps?: string[];
  questions?: string[];
  red_flags?: string[];
  bring_to_doctor?: string[];
  urgency?: string;
}

function SummaryScreen({ messages, userTurnCount }: { messages: Message[]; userTurnCount: number }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetchedCount, setLastFetchedCount] = useState(0);

  const userMessages = messages.filter((m) => m.role === "user");

  useEffect(() => {
    if (userMessages.length < 2 || userMessages.length === lastFetchedCount) return;
    setLoading(true);
    const symptomsText = userMessages.map((m) => m.text).join("\n");
    fetch(`${API_BASE}/symptoms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms: symptomsText }),
    })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLastFetchedCount(userMessages.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userTurnCount]);

  const questions = data?.questions ?? [];

  if (userMessages.length < 2) {
    return (
      <div className="screen-pad">
        <p className="eyebrow">Summary</p>
        <h2 className="headline">Nothing here yet</h2>
        <div className="summary-empty">
          <Icon name="clipboard" />
          <h4>Start a conversation</h4>
          <p>Talk to Nest on the Assistant tab and this fills in as you go.</p>
        </div>
      </div>
    );
  }

  const progressPct = Math.min(100, Math.round((Math.min(userTurnCount, 5) / 5) * 100));

  return (
    <div className="screen-pad">
      <div className="summary-hero">
        <p className="eyebrow">Living summary</p>
        <h2 className="headline">Building <em>as you talk</em></h2>
        <div className="summary-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="progress-label">{progressPct}%</span>
        </div>
      </div>
      {loading && <p style={{ fontSize: "0.85rem", color: "var(--ink-faint)", margin: "12px 0" }}>Analyzing your conversation…</p>}
      {data && (
        <div className="section-list">
          <div className="card section-card">
            <div className="section-title-row">
              <span className="sicon summary"><Icon name="summary" /></span>
              <h4>Summary</h4>
            </div>
            <div className="section-body"><p>{data.summary}</p></div>
          </div>
          {(data.next_steps ?? []).length > 0 && (
            <div className="card section-card">
              <div className="section-title-row">
                <span className="sicon steps"><Icon name="check" /></span>
                <h4>Next steps</h4>
              </div>
              <ul className="section-list-items">
                {(data.next_steps ?? []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {questions.length > 0 && (
            <div className="card section-card">
              <div className="section-title-row">
                <span className="sicon questions"><Icon name="flag" /></span>
                <h4>Questions to ask your provider</h4>
              </div>
              <ul className="section-list-items">
                {questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
          {(data.red_flags ?? []).length > 0 && (
            <div className="card section-card flags">
              <div className="section-title-row">
                <span className="sicon flags"><Icon name="alert" /></span>
                <h4>Seek care if…</h4>
              </div>
              <ul className="section-list-items">
                {(data.red_flags ?? []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileScreen({ lang, setLang }: { lang: string; setLang: (l: string) => void }) {
  return (
    <div className="screen-pad">
      <p className="eyebrow">Profile</p>
      <div className="profile-header" style={{ marginTop: 8 }}>
        <div className="avatar">M</div>
        <div>
          <h3>Maya Alvarez</h3>
          <p>On-device profile</p>
        </div>
      </div>
      <p className="profile-section-label">Language</p>
      <div className="lang-row">
        <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")} type="button">English</button>
        <button className={lang === "es" ? "active" : ""} onClick={() => setLang("es")} type="button">Español</button>
      </div>
      <p className="profile-section-label">Data & privacy</p>
      <div className="profile-row-group">
        <div className="profile-row">
          <span className="ricon"><Icon name="export" /></span>
          <div className="rtext">
            <p className="rtitle">Export my data</p>
            <p className="rsub">Download everything stored on this device</p>
          </div>
          <Icon name="chevron" className="chev" width={16} height={16} />
        </div>
        <div className="profile-row">
          <span className="ricon"><Icon name="globe" /></span>
          <div className="rtext">
            <p className="rtitle">Local processing</p>
            <p className="rsub">On · nothing leaves this device</p>
          </div>
          <Icon name="chevron" className="chev" width={16} height={16} />
        </div>
        <div className="profile-row">
          <span className="ricon"><Icon name="bell" /></span>
          <div className="rtext">
            <p className="rtitle">Notifications</p>
            <p className="rsub">Off</p>
          </div>
          <Icon name="chevron" className="chev" width={16} height={16} />
        </div>
      </div>
      <p className="profile-section-label">About</p>
      <div className="profile-row-group">
        <div className="profile-row">
          <span className="ricon"><Icon name="voice" /></span>
          <div className="rtext">
            <p className="rtitle">Nest</p>
            <p className="rsub">Version 0.1.0 · demo build</p>
          </div>
        </div>
      </div>
      <button className="danger-btn" type="button">Delete all data on this device</button>
    </div>
  );
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [tab, setTab] = useState("chat");
  const [lang, setLang] = useState("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userTurnCount, setUserTurnCount] = useState(0);
  const [showNudge, setShowNudge] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docContext, setDocContext] = useState<string>("");

  return (
    <>
      <style>{`
:root {
  --page-bg-1: #f5f0e6;
  --page-bg-2: #fdf6e5;

  --app-bg: #fdf6e5;
  --card: #ffffff;

  --lavender: #6b5fc7;
  --lavender-dark: #52469f;
  --lavender-tint: #ece8fa;
  --lavender-soft: #dcd5f4;

  --coral: #e2694f;
  --coral-tint: #fbe4de;

  --sage: #4f8f6d;
  --sage-tint: #e2f0e6;

  --amber: #c08a2e;
  --amber-tint: #f4e8cc;

  --ink: #211d2e;
  --ink-soft: #5d5770;
  --ink-faint: #938da6;
  --line: #e9e4f4;

  --nav-bg: #221d33;

  --sans: "Plus Jakarta Sans", -apple-system, sans-serif;
  --serif: "Fraunces", Georgia, serif;

  --radius-lg: 26px;
  --radius-md: 18px;
  --radius-sm: 12px;

  --shadow-card: 0 1px 2px rgba(33, 29, 46, 0.05), 0 10px 24px -14px rgba(33, 29, 46, 0.22);
  --shadow-float: 0 4px 10px rgba(33, 29, 46, 0.08), 0 20px 40px -18px rgba(107, 95, 199, 0.35);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  font-family: var(--sans);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  background: var(--page-bg-2);
  background-image:
    radial-gradient(ellipse 900px 600px at 15% -5%, var(--page-bg-1), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 100%, #ede8f5, transparent 55%);
  background-attachment: fixed;
}

#root { min-height: 100vh; }

.page-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.phone-frame {
  position: relative;
  width: 390px;
  height: 844px;
  max-height: 92vh;
  background: var(--app-bg);
  border-radius: 52px;
  box-shadow: var(--shadow-float), 0 0 0 10px #17131f, 0 0 0 12px rgba(255,255,255,0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.status-bar {
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink);
  position: relative;
  z-index: 5;
}

.status-bar .dynamic-island {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 108px;
  height: 28px;
  background: #0f0d16;
  border-radius: 16px;
}

.status-icons { display: flex; align-items: center; gap: 5px; }

.screen-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.screen-body::-webkit-scrollbar { display: none; }

.screen-pad { padding: 6px 22px 24px; }

/* Bottom nav */
.bottom-nav {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: var(--nav-bg);
  margin: 0 16px 18px;
  padding: 8px;
  border-radius: 999px;
  box-shadow: 0 10px 26px -10px rgba(20, 16, 32, 0.55);
}

.nav-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: #a49dbe;
  padding: 11px 8px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, flex 0.2s ease;
}

.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }

.nav-item span {
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-width 0.25s ease, opacity 0.2s ease;
}

.nav-item.active { background: var(--lavender); color: #fff; flex: 1.7; }
.nav-item.active span { max-width: 100px; opacity: 1; margin-left: 2px; }

/* Typography */
.eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lavender);
  margin: 0 0 6px;
}

.headline {
  font-family: var(--sans);
  font-weight: 800;
  font-size: 1.5rem;
  line-height: 1.25;
  margin: 0;
  color: var(--ink);
}

.headline em {
  font-family: var(--serif);
  font-style: italic;
  font-weight: 500;
  color: var(--lavender-dark);
}

.subtext { color: var(--ink-soft); font-size: 0.9rem; line-height: 1.55; margin: 8px 0 0; }

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--lavender);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 15px 22px;
  font-family: var(--sans);
  font-weight: 700;
  font-size: 0.94rem;
  cursor: pointer;
  box-shadow: 0 10px 22px -10px rgba(107, 95, 199, 0.6);
  transition: transform 0.15s ease, background 0.15s ease;
  width: 100%;
}
.btn-primary:hover:not(:disabled) { background: var(--lavender-dark); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Cards */
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 16px 18px;
}

/* Privacy pill */
.privacy-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--sage-tint);
  color: #2c5940;
  border: 1px solid #cfe4d6;
  border-radius: 999px;
  padding: 7px 14px 7px 10px;
  font-size: 0.78rem;
  font-weight: 700;
}

.privacy-pill .dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--sage);
  position: relative;
}
.privacy-pill .dot::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px solid var(--sage);
  opacity: 0.55;
  animation: pulse 2.2s ease-out infinite;
}

@keyframes pulse {
  0% { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 460px) {
  .phone-frame { width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; box-shadow: none; }
  .page-shell { padding: 0; }
}

/* ===== Onboarding ===== */
.onboard-screen { height: 100%; display: flex; flex-direction: column; }

.onboard-hero {
  position: relative;
  flex: 0 0 56%;
  overflow: hidden;
  border-radius: 0 0 40px 40px;
  display: flex;
  flex-direction: column;
  transition: background 0.5s ease;
}

.onboard-hero .grain { display: none; }

.onboard-topbar {
  position: relative;
  z-index: 10;
  padding: 16px 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.onboard-wordmark {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-weight: 800;
  font-size: 1rem;
}

.brand-mark {
  width: 30px; height: 30px;
  border-radius: 9px;
  background: rgba(255,255,255,0.22);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.brand-mark svg { width: 16px; height: 16px; }

.skip-btn {
  position: relative;
  z-index: 2;
  border: none;
  background: rgba(255,255,255,0.22);
  color: #fff;
  font-family: var(--sans);
  font-weight: 700;
  font-size: 0.78rem;
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.onboard-illustration {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.onboard-slide-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  display: block;
}

.agent-mark {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(155deg, #8f83e3, #6b5fc7 55%, #4a3f9c 100%);
  box-shadow: 0 10px 26px -10px rgba(107, 95, 199, 0.55);
}
.agent-mark svg { stroke: #fff; }

.agent-mark.lg {
  width: 168px; height: 168px;
  border-radius: 46px;
  animation: mark-breathe 4.5s ease-in-out infinite;
}
.agent-mark.lg svg { width: 64px; height: 64px; }
.agent-mark.lg::after {
  content: "";
  position: absolute;
  inset: -14px;
  border-radius: 58px;
  border: 1.5px solid rgba(107, 95, 199, 0.28);
}
.agent-mark.md { width: 52px; height: 52px; border-radius: 16px; }
.agent-mark.md svg { width: 22px; height: 22px; }
.agent-mark.sm { width: 26px; height: 26px; border-radius: 8px; }
.agent-mark.sm svg { width: 12px; height: 12px; }

@keyframes mark-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.035); }
}

.onboard-sheet {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px 20px;
}

.onboard-header {
  flex-shrink: 0;
  background: var(--app-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px 10px;
  border-bottom: 1px solid var(--line);
}

.onboard-wordmark-img {
  height: 32px;
  width: auto;
  object-fit: contain;
  mix-blend-mode: multiply;
}

.onboard-copy { flex: 1; }

.onboard-copy .eyebrow-line {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--ink-soft);
  margin: 0 0 4px;
  letter-spacing: 0.01em;
}

.onboard-copy .bold-line {
  font-family: var(--sans);
  font-weight: 800;
  font-size: 1.6rem;
  color: var(--ink);
  margin: 0 0 10px;
  line-height: 1.15;
}

.onboard-copy .subtext { max-width: 32ch; }

.onboard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.dot-pagination { display: flex; gap: 6px; }
.dot-pagination span {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--line);
  transition: background 0.2s ease, width 0.2s ease;
}
.dot-pagination span.active { background: var(--lavender); width: 20px; border-radius: 4px; }

.onboard-nav-btns { display: flex; align-items: center; gap: 10px; }

.nav-circle-btn {
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink-soft);
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.nav-circle-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.nav-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: var(--lavender);
  color: #fff;
  font-family: var(--sans);
  font-weight: 700;
  font-size: 0.88rem;
  padding: 13px 20px;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 10px 22px -10px rgba(107, 95, 199, 0.55);
  white-space: nowrap;
}

/* ===== Chat ===== */
.chat-screen { display: flex; flex-direction: column; height: 100%; }

.chat-header {
  padding: 4px 22px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.chat-header .greeting { font-family: var(--sans); font-weight: 800; font-size: 1.3rem; margin: 0; }
.chat-header .greeting em { font-family: var(--serif); font-style: italic; color: var(--lavender-dark); font-weight: 500; }

.agent-bird {
  object-fit: contain;
  mix-blend-mode: multiply;
  flex-shrink: 0;
}
.agent-bird-sm {
  width: 26px;
  height: 26px;
}
.agent-bird-md {
  width: 52px;
  height: 52px;
}

.chat-thread {
  flex: 1;
  overflow-y: auto;
  padding: 8px 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scrollbar-width: none;
}
.chat-thread::-webkit-scrollbar { display: none; }

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 14px;
  padding: 0 20px;
}

.bubble-row { display: flex; gap: 8px; align-items: flex-end; animation: rise 0.35s ease both; }
.bubble-row.agent { justify-content: flex-start; }
.bubble-row.user { justify-content: flex-end; }

.bubble { max-width: 78%; padding: 11px 14px; font-size: 0.9rem; line-height: 1.48; }
.bubble-row.agent .bubble {
  background: var(--card);
  border: 1px solid var(--line);
  color: var(--ink);
  border-radius: 4px 16px 16px 16px;
  box-shadow: var(--shadow-card);
}
.bubble-row.user .bubble { background: var(--lavender); color: #fff; border-radius: 16px 4px 16px 16px; }

.typing-dots { display: inline-flex; gap: 4px; padding: 4px 2px; }
.typing-dots span {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
  animation: typing 1.1s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}

.provider-nudge {
  align-self: center;
  width: 100%;
  background: linear-gradient(155deg, var(--coral-tint), #fff);
  border: 1px solid #f0c4b4;
  border-radius: var(--radius-md);
  padding: 14px 16px;
  animation: rise 0.4s ease both;
}
.provider-nudge .nudge-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--coral);
  margin-bottom: 6px;
}
.provider-nudge p { margin: 0; font-size: 0.92rem; font-weight: 600; color: var(--ink); line-height: 1.45; }
.provider-nudge .nudge-sub { margin-top: 6px; font-size: 0.78rem; font-weight: 400; color: var(--ink-soft); }

.chat-input-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px 4px;
}
.chat-input-bar input {
  flex: 1;
  border: 1px solid var(--line);
  background: var(--card);
  border-radius: 999px;
  padding: 12px 16px;
  font-family: var(--sans);
  font-size: 0.88rem;
  outline: none;
  color: var(--ink);
}
.chat-input-bar input:focus { border-color: var(--lavender); box-shadow: 0 0 0 3px var(--lavender-tint); }

.icon-btn {
  width: 42px; height: 42px;
  border-radius: 50%;
  border: none;
  background: var(--lavender);
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.icon-btn:hover:not(:disabled) { background: var(--lavender-dark); transform: translateY(-1px); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.icon-btn svg { width: 17px; height: 17px; }

.quick-replies { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 18px 10px; flex-shrink: 0; }
.quick-chip {
  border: 1px dashed var(--lavender-soft);
  background: var(--lavender-tint);
  color: var(--lavender-dark);
  font-family: var(--sans);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 7px 13px;
  border-radius: 999px;
  cursor: pointer;
}

/* ===== Documents ===== */
.doc-source-toggle { display: flex; gap: 8px; margin: 4px 0 16px; }
.doc-source-toggle button {
  flex: 1;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--ink-soft);
  font-family: var(--sans);
  font-weight: 700;
  font-size: 0.82rem;
  padding: 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.doc-source-toggle button.active { background: var(--lavender); border-color: var(--lavender); color: #fff; }

.upload-zone {
  border: 1.5px dashed var(--lavender-soft);
  background: var(--lavender-tint);
  border-radius: var(--radius-md);
  padding: 26px 18px;
  text-align: center;
  cursor: pointer;
  margin-bottom: 20px;
  transition: background 0.15s ease;
}
.upload-zone:hover { background: #e2dcf6; }
.upload-zone .plus {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  margin: 0 auto 10px;
  color: var(--lavender);
  box-shadow: var(--shadow-card);
}
.upload-zone h4 { margin: 0 0 4px; font-size: 0.92rem; color: var(--ink); }
.upload-zone p { margin: 0; font-size: 0.76rem; color: var(--ink-soft); }
.upload-types { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }
.upload-types span { font-size: 0.7rem; font-weight: 700; color: var(--lavender-dark); background: #fff; padding: 3px 9px; border-radius: 999px; }

.doc-list { display: flex; flex-direction: column; gap: 10px; }
.doc-card { display: flex; gap: 12px; padding: 13px 14px; animation: rise 0.3s ease both; }
.doc-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--lavender-tint); color: var(--lavender-dark); display: grid; place-items: center; flex-shrink: 0; }
.doc-icon svg { width: 18px; height: 18px; }
.doc-meta { flex: 1; min-width: 0; }
.doc-meta .doc-name { font-weight: 700; font-size: 0.88rem; margin: 0 0 2px; }
.doc-meta .doc-sub { font-size: 0.76rem; color: var(--ink-faint); display: flex; align-items: center; gap: 6px; }

.source-tag { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 999px; }
.source-tag.you { background: var(--sage-tint); color: #2c5940; }
.source-tag.provider { background: var(--amber-tint); color: #7a5c1c; }
.doc-empty { text-align: center; padding: 30px 10px; color: var(--ink-faint); font-size: 0.84rem; }

/* ===== Summary ===== */
.summary-hero { margin-bottom: 14px; }
.summary-progress { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.progress-track { flex: 1; height: 6px; background: var(--line); border-radius: 999px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--lavender); border-radius: 999px; transition: width 0.4s ease; }
.progress-label { font-size: 0.72rem; font-weight: 700; color: var(--ink-faint); flex-shrink: 0; }

.section-list { display: flex; flex-direction: column; gap: 12px; }
.section-card { padding: 16px 17px; }
.section-card.flags { background: var(--coral-tint); border-color: #f0c4b4; }
.section-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.section-title-row .sicon { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; flex-shrink: 0; }
.section-title-row .sicon svg { width: 13px; height: 13px; }
.sicon.summary { background: var(--lavender-tint); color: var(--lavender-dark); }
.sicon.steps { background: var(--sage-tint); color: var(--sage); }
.sicon.questions { background: var(--amber-tint); color: var(--amber); }
.sicon.flags { background: #f3c3af; color: #a13b21; }
.section-title-row h4 { margin: 0; font-size: 0.9rem; font-weight: 800; }
.section-card.flags h4 { color: #8a2f18; }
.section-body p { margin: 0; font-size: 0.86rem; line-height: 1.55; color: var(--ink-soft); }
.section-list-items { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.section-list-items li { display: flex; gap: 8px; font-size: 0.85rem; line-height: 1.5; color: var(--ink-soft); }
.section-list-items li::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--sage); margin-top: 7px; flex-shrink: 0; }
.section-card.flags .section-list-items li { color: #7a2812; }
.section-card.flags .section-list-items li::before { background: #a13b21; }
.summary-empty { text-align: center; padding: 46px 16px; color: var(--ink-faint); }
.summary-empty svg { width: 30px; height: 30px; color: var(--lavender); margin-bottom: 10px; opacity: 0.7; }
.summary-empty h4 { font-family: var(--serif); font-style: italic; font-weight: 500; color: var(--ink-soft); margin: 0 0 4px; }
.summary-empty p { margin: 0; font-size: 0.82rem; max-width: 26ch; margin-inline: auto; }

/* ===== Profile ===== */
.profile-header { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(140deg, #a89bef, #6b5fc7);
  display: grid;
  place-items: center;
  color: #fff;
  font-family: var(--serif);
  font-weight: 500;
  font-size: 1.3rem;
  flex-shrink: 0;
}
.profile-header h3 { margin: 0 0 2px; font-size: 1.05rem; }
.profile-header p { margin: 0; font-size: 0.8rem; color: var(--ink-faint); }
.profile-section-label { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); margin: 22px 0 10px; }
.profile-section-label:first-of-type { margin-top: 0; }
.profile-row-group { border: 1px solid var(--line); border-radius: var(--radius-md); overflow: hidden; background: var(--card); box-shadow: var(--shadow-card); }
.profile-row { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-bottom: 1px solid var(--line); }
.profile-row:last-child { border-bottom: none; }
.profile-row .ricon { width: 32px; height: 32px; border-radius: 9px; background: var(--lavender-tint); color: var(--lavender-dark); display: grid; place-items: center; flex-shrink: 0; }
.profile-row .ricon svg { width: 15px; height: 15px; }
.profile-row .rtext { flex: 1; min-width: 0; }
.profile-row .rtext .rtitle { font-size: 0.87rem; font-weight: 700; margin: 0; }
.profile-row .rtext .rsub { font-size: 0.74rem; color: var(--ink-faint); margin: 1px 0 0; }
.profile-row .chev { color: var(--ink-faint); flex-shrink: 0; }
.lang-row { display: flex; border: 1px solid var(--line); border-radius: 999px; padding: 3px; background: var(--app-bg); }
.lang-row button { flex: 1; border: none; background: transparent; padding: 8px; font-size: 0.8rem; font-weight: 700; color: var(--ink-faint); border-radius: 999px; cursor: pointer; }
.lang-row button.active { background: var(--lavender); color: #fff; }
.danger-btn { width: 100%; border: 1px solid #f0c4b4; background: var(--coral-tint); color: #a13b21; font-family: var(--sans); font-weight: 700; font-size: 0.86rem; padding: 13px; border-radius: var(--radius-md); cursor: pointer; margin-top: 22px; }
`}</style>
      <PhoneFrame footer={started ? <BottomNav active={tab} onChange={setTab} /> : null}>
        {!started ? (
          <WelcomeScreen onGetStarted={() => setStarted(true)} />
        ) : (
          <>
            {tab === "chat" && (
              <ChatScreen
                messages={messages}
                setMessages={setMessages}
                userTurnCount={userTurnCount}
                setUserTurnCount={setUserTurnCount}
                showNudge={showNudge}
                setShowNudge={setShowNudge}
                docContext={docContext}
                lang={lang}
              />
            )}
            {tab === "documents" && (
              <DocumentsScreen
                docs={docs}
                setDocs={setDocs}
                setMessages={setMessages}
                setDocContext={setDocContext}
                onGoToChat={() => setTab("chat")}
                lang={lang}
              />
            )}
            {tab === "summary" && <SummaryScreen messages={messages} userTurnCount={userTurnCount} />}
            {tab === "profile" && <ProfileScreen lang={lang} setLang={setLang} />}
          </>
        )}
      </PhoneFrame>
    </>
  );
}
