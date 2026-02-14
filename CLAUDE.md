# CLAUDE.md — DevSwarm AI Agent Instructions

## Project Overview

DevSwarm is a **multi-agent virtual office** where AI agents (powered by LangGraph + Google Gemini) collaborate in a simulated workspace visible through a real-time dashboard. The architecture is a monorepo with three services:

| Service | Language | Port | Directory |
|---------|----------|------|-----------|
| Frontend | Next.js 16 + React 19 | 3000 | `frontend/` |
| Backend | Go + Chi router | 8080 | `backend/` |
| AI Engine | Python + LangGraph | 8000 | `ai-engine/` |

All services share a PostgreSQL database (connection via `DATABASE_URL`).

---

## Quick Start

```bash
# 1. Start Postgres (via Docker)
docker-compose up -d db

# 2. AI Engine
cd ai-engine
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

# 3. Go Backend
cd backend
go run cmd/server/main.go

# 4. Frontend
cd frontend
npm install
npm run dev
```

---

## Directory Structure

```
DevSwarm/
├── frontend/          # Next.js 16 dashboard
│   ├── src/
│   │   ├── app/       # Next.js App Router (pages + layouts)
│   │   ├── components/# 10 React components
│   │   └── lib/       # Core logic (types, store, api, websocket)
│   ├── __tests__/     # Vitest test suite (172 tests)
│   │   ├── lib/       # Unit tests for lib modules
│   │   ├── components/# Component tests with RTL
│   │   └── helpers/   # Shared fixtures
│   └── vitest.config.ts
├── backend/           # Go Chi server
│   ├── cmd/server/    # Entrypoint
│   └── internal/      # Hub, state, handlers
├── ai-engine/         # Python LangGraph engine
│   ├── agents/        # 8 AI agents (marco, jimmy, pablo, etc.)
│   ├── core/          # State, schemas, context, graph
│   └── tests/         # pytest suite (231 tests)
│       ├── agents/    # Agent-specific tests
│       └── engine/    # Core infrastructure tests
├── database/          # SQL schema
└── docker-compose.yml
```

---

## Testing

### Frontend (Vitest + React Testing Library)
```bash
cd frontend
npm test           # Run all 172 tests
npm run test:watch # Watch mode
```

### AI Engine (pytest)
```bash
cd ai-engine
pytest tests/ -v          # All 231 tests
pytest tests/agents/ -v   # Agent tests only
pytest tests/engine/ -v   # Engine tests only
```

### Go Backend
```bash
cd backend
go test ./... -v          # All 24 tests
```

---

## Key Architecture Decisions

### Frontend
- **State management**: Zustand store (`src/lib/store.ts`) — central app state with selectors
- **Real-time updates**: WebSocket client (`src/lib/websocket.ts`) with auto-reconnect + exponential backoff
- **Data normalization**: `normalizeAgent/Task/Message` in `types.ts` converts snake_case API → camelCase
- **Auth**: Simulated auth via localStorage (`AuthProvider.tsx`)
- **Path alias**: `@/` maps to `src/` (configured in tsconfig + vitest)

### Backend (Go)
- **WebSocket Hub**: Fan-out state updates to connected clients
- **State Poller**: Periodically fetches AI engine state and broadcasts
- **REST API**: CRUD for agents, tasks, messages at `/api/*`

### AI Engine (Python)
- **Agent graph**: LangGraph StateGraph orchestrating 8 agents
- **Marco**: CEO/orchestrator that delegates to other agents
- **MCP Server**: Model Context Protocol for tool integration
- **Database**: asyncpg for PostgreSQL persistence

---

## Environment Variables

| Variable | Used By | Default |
|----------|---------|---------|
| `DATABASE_URL` | Backend, AI Engine | — |
| `GOOGLE_API_KEY` | AI Engine | — |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:8080/api` |
| `NEXT_PUBLIC_WS_URL` | Frontend | `ws://localhost:8080/ws` |

---

## Code Style

- **Frontend**: TypeScript strict mode, ESLint, TailwindCSS v4
- **Backend**: Standard Go formatting (`gofmt`)
- **AI Engine**: Python 3.11+, type hints, Pydantic models

## Important Notes

- The frontend uses **React 19** with the new JSX transform
- The Go backend uses **Chi v5** router (not the standard library)
- Agent tests include both deterministic and probabilistic categories (the `@probabilistic` decorator runs tests multiple times)
- All component tests mock `next/navigation`, `next/link`, and `framer-motion` (see `__tests__/setup.ts`)
