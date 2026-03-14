"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { normalizeMessage } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Send, Bot, User, Cpu, Loader2, Wifi, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const DEFAULT_AGENT_COLOR = "#94a3b8";
const SYSTEM_AGENT: AgentMeta = {
  name: "System",
  initials: "S",
  avatarColor: "#3b82f6",
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { agents, connected } = useStore();

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
    const interval = setInterval(fetchMessages, 3000);
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
    <div className="flex flex-col h-full bg-background text-foreground relative overflow-hidden font-sans">
      {/* ── Background Patterns ── */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-accent)_0%,transparent_70%)]" />
      </div>

      {/* ── Status Header ── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
        <div className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-full border backdrop-blur-md shadow-2xl transition-all duration-500",
            connected ? "bg-ok/5 border-ok/20 text-ok" : "bg-err/5 border-err/20 text-err"
        )}>
          <Wifi className={cn("w-3.5 h-3.5", connected && "animate-pulse")} />
          <span className="text-[10px] font-heading font-bold uppercase tracking-[.2em]">
            {connected ? "Neural Link Active" : "Link Disconnected"}
          </span>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 custom-scrollbar relative z-10">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-surface-2 border border-edge flex items-center justify-center shadow-2xl relative">
                <div className="absolute inset-0 bg-accent/10 rounded-3xl animate-ping opacity-20" />
                <Bot className="w-10 h-10 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-heading font-bold uppercase tracking-widest">Awaiting Directives</h3>
                <p className="text-[11px] text-secondary max-w-[240px] uppercase tracking-tighter leading-relaxed">
                  Interface ready for swarm coordination. Assign a task to the orchestrator to begin.
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.from === "user";
              const showAvatar = idx === 0 || messages[idx - 1].from !== msg.from;
              const meta = agentMeta[msg.from] || createFallbackAgentMeta(msg.from || "unknown");

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: isUser ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-start gap-4 group",
                    isUser ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div className="shrink-0 mt-1 relative">
                    {showAvatar ? (
                      <div 
                        className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all group-hover:scale-110",
                            isUser ? "bg-surface-3 border-edge" : "bg-surface-2"
                        )}
                        style={{ borderColor: isUser ? undefined : `${meta.avatarColor}40`, backgroundColor: isUser ? undefined : `${meta.avatarColor}10` }}
                      >
                        {isUser ? <User className="w-4 h-4 text-accent" /> : (
                            <span className="text-xs font-heading font-bold" style={{ color: meta.avatarColor }}>
                                {meta.initials}
                            </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-9 h-0" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={cn("flex flex-col space-y-1.5 max-w-[80%] sm:max-w-[65%]", isUser ? "items-end" : "items-start")}>
                    {showAvatar && !isUser && (
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-heading font-bold uppercase tracking-widest" style={{ color: meta.avatarColor }}>
                                {meta.name}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-edge" />
                            <span className="text-[8px] font-bold text-secondary uppercase tracking-tighter">
                                {msg.type}
                            </span>
                        </div>
                    )}
                    
                    <div className={cn(
                        "relative px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed transition-all shadow-sm group-hover:shadow-md border",
                        isUser 
                            ? "bg-accent border-accent/20 text-white rounded-tr-none" 
                            : "bg-surface-2 border-edge text-foreground/90 rounded-tl-none"
                    )}>
                      <p className="whitespace-pre-wrap selection:bg-white/20">{msg.content}</p>
                      
                      <div className={cn(
                        "absolute top-0 w-2 h-2",
                        isUser ? "-right-2 bg-accent [clip-path:polygon(0_0,0_100%,100%_0)]" : "-left-2 bg-surface-2 [clip-path:polygon(100%_0,100%_100%,0_0)]"
                      )} />
                    </div>

                    <div className={cn("px-2 flex items-center gap-2 text-[9px] font-bold text-secondary uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity")}>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                        {isUser && <span className="text-accent">✓ Delivered</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="p-6 sm:p-10 relative z-20">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-[1px] bg-gradient-to-r from-accent/50 to-violet-500/50 rounded-[2rem] blur-sm opacity-20 group-focus-within:opacity-40 transition-opacity" />
          
          <form
            onSubmit={handleSubmit}
            className="relative flex items-center gap-2 bg-surface-2/80 backdrop-blur-xl p-2 rounded-[2rem] border border-edge shadow-2xl focus-within:border-accent/50 transition-all"
          >
            <div className="pl-4 shrink-0">
                <Cpu className={cn("w-5 h-5 transition-colors", isLoading ? "text-accent animate-spin" : "text-secondary")} />
            </div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Inject Swarm Directives..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-secondary/50 px-3 py-4 focus:outline-none min-w-0 font-medium"
              disabled={isLoading}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "group relative w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 overflow-hidden cursor-pointer",
                !input.trim() || isLoading
                  ? "bg-surface-3 text-secondary/30 cursor-not-allowed"
                  : "bg-accent text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                    <Send className="w-5 h-5 relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-accent to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </form>
          
          <div className="flex items-center justify-between mt-4 px-6">
            <div className="flex items-center gap-4 text-[9px] font-heading font-bold text-secondary uppercase tracking-[.2em]">
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    <span>Llm_Model: GPT-4o</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    <span>Swarm_Nodes: {Object.keys(agents).length}</span>
                </div>
            </div>
            <span className="text-[9px] font-mono font-bold text-secondary/40 uppercase tracking-tighter">
              Secured_Neural_Link // AES-256
            </span>
          </div>
        </div>
      </div>
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
