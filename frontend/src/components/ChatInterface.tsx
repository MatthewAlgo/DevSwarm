import React, { useState, useEffect, useRef } from 'react';

// Types
interface Message {
    id: string;
    from: string;
    to: string;
    content: string;
    type: string;
    createdAt: string;
}

// Agent Configuration
const AGENTS: Record<string, { name: string; role: string; color: string; initials: string }> = {
    orchestrator: { name: 'Orchestrator', role: 'CEO', color: 'bg-violet-600', initials: 'O' },
    crawler: { name: 'Crawler', role: 'Crawler', color: 'bg-blue-600', initials: 'C' },
    researcher: { name: 'Researcher', role: 'Researcher', color: 'bg-pink-600', initials: 'R' },
    viral_engineer: { name: 'Viral Engineer', role: 'Viral', color: 'bg-amber-500', initials: 'V' },
    comms: { name: 'Comms', role: 'Comms', color: 'bg-emerald-500', initials: 'Co' },
    devops: { name: 'DevOps', role: 'DevOps', color: 'bg-red-500', initials: 'D' },
    archivist: { name: 'Archivist', role: 'Archivist', color: 'bg-cyan-600', initials: 'A' },
    frontend_designer: { name: 'Designer', role: 'Designer', color: 'bg-orange-500', initials: 'F' },
    user: { name: 'User', role: 'Admin', color: 'bg-neutral-700', initials: 'U' },
    system: { name: 'System', role: 'System', color: 'bg-gray-500', initials: 'S' },
};

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Poll for messages
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/messages?limit=50&agent_id=user');
                if (!res.ok) return;
                const data = await res.json();
                interface MsgData {
                    id: string;
                    from_agent: string;
                    to_agent: string;
                    content: string;
                    message_type: string;
                    created_at: string;
                }

                // Transform backend message format to frontend
                const formatted = (data as MsgData[]).map((m) => ({
                    id: m.id,
                    from: m.from_agent,
                    to: m.to_agent,
                    content: m.content,
                    type: m.message_type,
                    createdAt: m.created_at,
                })).reverse(); // Oldest first for chat history

                setMessages(formatted);
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setIsLoading(true);

        try {
            // 1. Create User Message
            await fetch('http://localhost:8080/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_agent: 'user',
                    to_agent: 'orchestrator',
                    content: userMessage,
                    message_type: 'chat',
                }),
            });

            // 2. Trigger Task (Goal) for Orchestrator
            await fetch('http://localhost:8080/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: userMessage,
                    description: "User prompt from Chat Interface",
                    status: "In Progress",
                    priority: 5,
                    created_by: "user"
                }),
            });

        } catch (err) {
            console.error("Failed to send message", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] text-neutral-200 font-sans relative">
            {/* Bot Status Indicator - Absolute position in top right of chat area */}
            <div className="absolute top-4 right-6 z-10 flex items-center gap-2 bg-neutral-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/5 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">System Online</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4 opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
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
                    const isUser = msg.from === 'user';
                    const showAvatar = idx === 0 || messages[idx - 1].from !== msg.from;
                    const agent = AGENTS[msg.from] || { name: msg.from, color: 'bg-gray-600', initials: '?' };

                    return (
                        <div
                            key={msg.id}
                            className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'} group animate-slideUp`}
                        >
                            {!isUser && (
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${showAvatar ? `${agent.color} text-white shadow-md` : 'opacity-0'}`}>
                                    {showAvatar ? agent.initials : ''}
                                </div>
                            )}

                            <div
                                className={`max-w-[85%] sm:max-w-[70%] px-5 py-3.5 shadow-sm text-[13px] leading-relaxed relative ${isUser
                                    ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-neutral-800 text-neutral-200 rounded-2xl rounded-tl-sm border border-neutral-700/50'
                                    }`}
                            >
                                {!isUser && showAvatar && (
                                    <span className={`block text-[10px] font-bold mb-1 tracking-wide uppercase ${agent.color.replace('bg-', 'text-').replace('-600', '-300').replace('-500', '-300')}`}>
                                        {agent.name}
                                    </span>
                                )}
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                <span className={`text-[9px] absolute bottom-1 right-3 opacity-0 group-hover:opacity-60 transition-opacity ${isUser ? 'text-violet-200' : 'text-neutral-500'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            {isUser && (
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs bg-neutral-700 text-neutral-300 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                    U
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 sm:p-6 bg-neutral-900/80 backdrop-blur-xl border-t border-white/5">
                <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-end gap-2 bg-neutral-800/50 p-1.5 rounded-3xl border border-neutral-700 focus-within:border-violet-500/50 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all">
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
                            ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
                            : 'bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/20 transform hover:scale-105 active:scale-95'
                            }`}
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
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
