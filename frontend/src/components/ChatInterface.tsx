"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { normalizeMessage } from "@/lib/types";
import { useStore } from "@/lib/store";

interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  type: string;
  createdAt: string;
}

interface AgentMeta {
  name: string;
  initials: string;
  avatarColor: string;
}

const DEFAULT_AGENT_COLOR = "#525252";
const SYSTEM_AGENT: AgentMeta = {
  name: "System",
  initials: "S",
  avatarColor: "#6b7280",
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agents = useStore((s) => s.agents);

  const agentMeta = useMemo(() => {
    const data: Record<string, AgentMeta> = {
      system: SYSTEM_AGENT,
    };
    for (const [id, agent] of Object.entries(agents)) {
      data[id] = {
        name: agent.name || id,
        initials: getInitials(agent.name || id),
        avatarColor: agent.avatarColor || DEFAULT_AGENT_COLOR,
      };
    }
    return data;
  }, [agents]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await api.getMessages(50, "user");
        const formatted = (data || [])
          .map((raw) => normalizeMessage(raw))
          .map((m) => ({
            id: m.id,
            from: m.fromAgent,
            to: m.toAgent,
            content: m.content,
            type: m.messageType,
            createdAt: m.createdAt,
          }))
          .reverse();

        setMessages(formatted);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      try {
        await api.sendMessage({
          fromAgent: "user",
          toAgent: "orchestrator",
          content: userMessage,
          messageType: "chat",
        });
      } catch (err) {
        // Persisting chat history is best-effort; goal triggering is the critical path.
        console.warn("Failed to persist chat message", err);
      }

      await api.triggerGoal(userMessage, ["orchestrator"]);
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-200 font-sans relative">
      <div className="absolute top-4 right-6 z-10 flex items-center gap-2 bg-neutral-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/5 shadow-lg">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">
          System Online
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div
            className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4 opacity-0 animate-fadeIn"
            style={{ animationFillMode: "forwards" }}
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/50 flex items-center justify-center text-3xl mb-2">
              👋
            </div>
            <p className="text-sm font-medium">No messages yet.</p>
            <p className="text-xs max-w-xs text-center leading-relaxed text-neutral-600">
              Start by saying hello or assigning a task to the Orchestrator.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.from === "user";
          const showAvatar = idx === 0 || messages[idx - 1].from !== msg.from;
          const meta =
            agentMeta[msg.from] || createFallbackAgentMeta(msg.from || "unknown");

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"} group animate-slideUp`}
            >
              {!isUser && (
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white ${showAvatar ? "shadow-md" : "opacity-0"}`}
                  style={{ background: meta.avatarColor }}
                >
                  {showAvatar ? meta.initials : ""}
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[70%] px-5 py-3.5 shadow-sm text-[13px] leading-relaxed relative ${isUser
                  ? "bg-violet-600 text-white rounded-2xl rounded-tr-sm"
                  : "bg-neutral-800 text-neutral-200 rounded-2xl rounded-tl-sm border border-neutral-700/50"
                  }`}
              >
                {!isUser && showAvatar && (
                  <span
                    className="block text-[10px] font-bold mb-1 tracking-wide uppercase"
                    style={{ color: meta.avatarColor }}
                  >
                    {meta.name}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span
                  className={`text-[9px] absolute bottom-1 right-3 opacity-0 group-hover:opacity-60 transition-opacity ${isUser ? "text-violet-200" : "text-neutral-500"}`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {isUser && (
                <div
                  className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs bg-neutral-700 text-neutral-300 ${showAvatar ? "opacity-100" : "opacity-0"}`}
                >
                  U
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 sm:p-6 bg-neutral-900/80 backdrop-blur-xl border-t border-white/5">
        <form
          onSubmit={handleSubmit}
          className="relative max-w-4xl mx-auto flex items-end gap-2 bg-neutral-800/50 p-1.5 rounded-3xl border border-neutral-700 focus-within:border-violet-500/50 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your command..."
            className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 px-5 py-3.5 focus:outline-none min-w-0"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 ${!input.trim() || isLoading
              ? "bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50"
              : "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20 transform hover:scale-105 active:scale-95"
              }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
        <p className="text-center text-neutral-600 text-[10px] mt-3 uppercase tracking-widest font-medium">
          DevSwarm Orchestration Layer
        </p>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function createFallbackAgentMeta(rawId: string): AgentMeta {
  const label = rawId.replace(/_/g, " ").trim();
  const name = label.length > 0 ? label : "Unknown";
  return {
    name,
    initials: getInitials(name),
    avatarColor: DEFAULT_AGENT_COLOR,
  };
}
