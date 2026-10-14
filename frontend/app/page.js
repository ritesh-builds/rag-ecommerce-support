"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const SUGGESTED_QUESTIONS = [
  "What is the return policy?",
  "How long does shipping take?",
  "How can I track my order?",
  "What payment methods do you accept?",
  "How do I exchange an item?",
  "What is the refund process?",
];

const BOT_AVATAR = (
  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/30">
    S
  </div>
);

function formatTime() {
  if (typeof window === "undefined") return "";
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 msg-animate">
      {BOT_AVATAR}
      <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm rounded-2xl rounded-bl-sm px-5 py-4 shadow-lg">
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-bounce" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-bounce" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-bounce" />
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  const isError = msg.isError;

  return (
    <div className={`flex items-end gap-3 msg-animate ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && BOT_AVATAR}
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
            isUser
              ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-br-sm shadow-indigo-500/25 whitespace-pre-wrap break-words"
              : isError
              ? "bg-rose-950/40 border border-rose-500/30 backdrop-blur-sm text-rose-200 rounded-bl-sm break-words"
              : "bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm text-slate-200 rounded-bl-sm break-words"
          }`}
        >
          {isUser ? (
            msg.content
          ) : (
            <div className="markdown-content space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:font-semibold [&_strong]:text-white [&_a]:text-indigo-400 [&_a]:underline [&_code]:bg-slate-900 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-indigo-300">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {msg.time && <span className="text-xs text-slate-500 px-1">{msg.time}</span>}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
          U
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "bot",
      content: "Hi! I'm ShopSphere's AI support assistant 👋\n\nAsk me anything about orders, returns, shipping, payments, and company policies.",
      time: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Set time for initial message on client mount to avoid Next.js prerender hydration error
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.id === 1 && !m.time ? { ...m, time: formatTime() } : m))
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        role: "bot",
        content: "Chat cleared. How can I help you today?",
        time: formatTime(),
      },
    ]);
  };

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: query,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8080/query?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status} (${res.statusText || "Error"})`);
      }
      const answer = await res.text();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          content: answer || "No response received.",
          time: formatTime(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          isError: true,
          content: `⚠️ Could not reach support backend (${err.message}). Make sure the Spring Boot server is running on port 8080.`,
          time: formatTime(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-dvh bg-slate-950 text-slate-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900/70 border-r border-slate-800/60 backdrop-blur-md p-6 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/40">
            S
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">ShopSphere</p>
            <p className="text-xs text-indigo-400 font-medium">AI Support</p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={clearChat}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Conversation
        </button>

        {/* Divider */}
        <div className="h-px bg-slate-800" />

        {/* Suggested Questions */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Quick Questions</p>
          <div className="flex flex-col gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                id={`suggest-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-left text-sm text-slate-400 hover:text-white hover:bg-slate-800/70 px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto">
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 text-xs text-slate-500 text-center">
            Powered by Google Gemini &amp; Spring AI
          </div>
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow-md">
              S
            </div>
            <div>
              <h1 className="font-semibold text-white text-base">AI Customer Support</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-glow" />
                <span className="text-xs text-emerald-400 font-medium">Assistant Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="md:hidden text-xs text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/50 px-2.5 py-1.5 rounded-lg"
            >
              Clear
            </button>
            <div className="text-xs text-slate-500 hidden sm:block">
              Ask anything about your orders, returns &amp; policies
            </div>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-5">
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </main>

        {/* Input Bar */}
        <div className="px-4 md:px-8 py-4 border-t border-slate-800/60 bg-slate-900/50 backdrop-blur-md">
          {/* Mobile quick suggestions */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="flex-shrink-0 text-xs text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 rounded-full px-3 py-1.5 hover:bg-indigo-500/20 transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all duration-200">
              <textarea
                ref={inputRef}
                id="chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={loading}
                className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 resize-none outline-none max-h-32 leading-relaxed disabled:opacity-50"
                style={{ height: "auto" }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                }}
              />
            </div>
            <button
              id="send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 disabled:shadow-none transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-45">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-slate-600 mt-3">
            Press <kbd className="bg-slate-800 px-1 rounded text-slate-400">Enter</kbd> to send · <kbd className="bg-slate-800 px-1 rounded text-slate-400">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
