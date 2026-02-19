# DevSwarm: Multi-Agent Virtual Office 🏢🐝

DevSwarm is a cutting-edge **multi-agent virtual office** where AI agents collaborate, think, and execute tasks in real-time. Built with a robust monorepo architecture, it simulation-driven dashboard allows you to visualize the inner workings of an AI-powered engineering team.

## 🌟 Key Features

- **Real-Time Visualization**: Watch agents move between rooms (Desks, Lounge, Server Room, Private Office) based on their current tasks.
- **Multimodal Collaboration**: 8 specialized AI agents (CEO, Deep Researcher, Content Crawler, etc.) working together powered by **Google Gemini** and **LangGraph**.
- **Live Thought Streams**: Inspect each agent's "Thought Chain" to see their reasoning process using the Model Context Protocol (MCP).
- **Kanban Task Orchestration**: Dynamically manage tasks that agents pick up and complete.
- **Inter-Agent Messaging**: A live feed of agents communicating and negotiating subtasks.
- **God Mode**: A global control interface to analyze system-wide performance, token costs, and issue direct goals to the swarm.

---

## 🏗 Architecture

DevSwarm follows a distributed 3-tier architecture:

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | Next.js 16, React 19, Zustand, TailwindCSS | High-performance dashboard with real-time WebSocket state management. |
| **Backend Gateway** | Go (Golang), Chi Router, WebSocket Hub | The primary entry point. Handles authentication, proxies requests, and fan-out state updates. |
| **AI Engine** | Python 3.12, LangGraph, Google Gemini | The "brain" of the operation. Orchestrates agent logic and persistence. |
| **Database/Cache** | PostgreSQL & Redis | Source of truth and high-speed pub/sub for real-time deltas. |

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router + Turbopack)
- **State**: Zustand (Atomic state updates)
- **Animation**: Framer Motion (Smooth agent transitions)
- **Styling**: Tailwind CSS v4 (Modern aesthetics)
- **Testing**: Vitest + React Testing Library (170+ tests)

### Backend (Go)
- **Router**: Chi v5
- **WebSocket**: Gorilla WebSocket
- **Persistence**: pgx/v5 (Postgres driver)
- **Testing**: Built-in Go `testing` package

### AI Engine (Python)
- **Orchestration**: LangGraph (Stateful, multi-agent graphs)
- **LLM**: Google Gemini 1.5 (Pro/Flash)
- **Protocol**: Model Context Protocol (MCP) for tools
- **Testing**: pytest (Deterministic & Probabilistic suites)

---

## ⚡ Performance & Scalability

- **Granular Delta Updates**: Reduced WebSocket traffic by over 90% by broadcasting only changed fields instead of the full system state.
- **N+1 Query Resolution**: Optimized database access in the AI Engine using `LEFT JOIN` and `array_agg`, reducing latency for task-heavy environments.
- **Go Gateway**: High-concurrency handling of thousands of concurrent WebSocket connections.

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Google AI API Key (for Gemini)

### Quick Launch (Docker)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MatthewAlgo/DevSwarm.git
   cd DevSwarm
   ```

2. **Configure environment**:
   Create a `.env` file in the root:
   ```env
   GOOGLE_API_KEY=your_gemini_key_here
   ```

3. **Spin up the swarm**:
   ```bash
   docker-compose up -d --build
   ```

4. **Access the office**:
   - **Dashboard**: http://localhost:3000
   - **Backend API**: http://localhost:8080/api
   - **AI Engine (Docs)**: http://localhost:8000/docs

---

## 🧪 Testing

We maintain a rigorous testing culture across all three layers:

### Frontend
```bash
cd frontend
npm test
```

### Backend
```bash
cd backend
go test ./... -v
```

### AI Engine
```bash
cd ai-engine
# Standard tests
pytest tests/ -v
# Probabilistic tests (LLM-focused)
PYTHONPATH=. pytest tests/agents/test_agent_probabilistic.py
```

---

## 🤖 Meet the Swarm

- **Orchestrator (CEO/Orchestrator)**: The central brain. Analyzes high-level goals and delegates tasks.
- **Researcher (Deep Researcher)**: Conducts academic and competitor research.
- **Crawler (Content Crawler)**: Scrapes the web and crawls documentation.
- **Archivist (KB Organizer)**: Keeps Notion and files structured.
- **Frontend Designer (Frontend Designer)**: Iterates on UI/UX mockups.
- **Comms (Comms Interface)**: Handles email and newsletters.
- **DevOps (DevOps Monitor)**: Watches server logs and uptime.
- **Viral Engineer (Viral Engineer)**: Manages social sentiment and trends.

---

## 📄 License
MIT License - Copyright (c) 2026 Matthew
