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

function BotAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 text-xs font-semibold shadow-sm">
      <svg
        className="w-4 h-4 text-zinc-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M9 13v2" />
        <path d="M15 13v2" />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs flex items-center justify-center shadow-sm">
      U
    </div>
  );
}

function formatTime() {
  if (typeof window === "undefined") return "";
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 msg-animate">
      <BotAvatar />
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-4">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dot-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dot-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dot-bounce" />
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  const isError = msg.isError;

  return (
    <div className={`flex items-start gap-3 msg-animate ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {isUser ? <UserAvatar /> : <BotAvatar />}
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-zinc-100 text-zinc-950 rounded-tr-sm whitespace-pre-wrap break-words shadow-sm font-normal"
              : isError
              ? "bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-tl-sm break-words shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm break-words shadow-sm"
          }`}
        >
          {isUser ? (
            msg.content
          ) : (
            <div className="markdown-content space-y-2 [&_p]:leading-relaxed [&_p]:text-zinc-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_strong]:font-semibold [&_strong]:text-white [&_a]:text-zinc-100 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-white [&_code]:bg-zinc-950 [&_code]:border [&_code]:border-zinc-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-zinc-200">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {msg.time && <span className="text-[11px] text-zinc-500 px-1 font-mono">{msg.time}</span>}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "bot",
      content:
        "Welcome to ShopSphere Support. How can I assist you with your orders, returns, shipping, or store policies today?",
      time: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
        content: "Chat cleared. What can I help you with?",
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
          content: `Backend unavailable (${err.message}). Please verify the Spring Boot server is running on port 8080.`,
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
    <div className="flex h-dvh bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-950 border-r border-zinc-800 p-5 gap-5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            S
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight tracking-tight">ShopSphere</p>
            <p className="text-[11px] text-zinc-400">Support Assistant</p>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={clearChat}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Conversation
        </button>

        <div className="h-px bg-zinc-850" />

        {/* Suggested Questions */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2.5 px-1">
            Common Topics
          </p>
          <div className="flex flex-col gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                id={`suggest-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-left text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 px-3 py-2 rounded-lg border border-transparent hover:border-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Enterprise RAG</span>
          <span>v1.0</span>
        </div>
      </aside>

      {/* ── Main Chat ── */}
      <div className="flex flex-col flex-1 min-w-0 bg-zinc-950">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs">
              S
            </div>
            <div>
              <h1 className="font-semibold text-white text-sm tracking-tight">Customer Support</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <span className="text-[11px] text-zinc-400 font-medium">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Clear
            </button>
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
        <div className="px-4 md:px-8 py-4 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur">
          {/* Mobile quick suggestions */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-2.5 mb-2.5">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="flex-shrink-0 text-xs text-zinc-300 border border-zinc-800 bg-zinc-900 rounded-lg px-2.5 py-1 hover:text-white hover:bg-zinc-850 transition-colors disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2.5 max-w-4xl mx-auto w-full">
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 focus-within:border-zinc-600 transition-colors">
              <textarea
                ref={inputRef}
                id="chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about orders, returns, shipping..."
                disabled={loading}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-32 leading-relaxed disabled:opacity-50"
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
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-400 mt-2.5">
            Press <kbd className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Enter</kbd> to send · <kbd className="bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded text-zinc-300 font-mono text-[10px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
