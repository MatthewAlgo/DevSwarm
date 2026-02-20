# CLAUDE.md - DevSwarm Maintainer And Operator Handbook

This document is the implementation and operations handbook for engineers and coding agents working in this repository.

Scope:
- How DevSwarm is wired internally.
- What must stay consistent across services.
- How to safely change contracts and behavior.
- What to run when debugging, verifying, and releasing changes.

For user-facing project overview and usage, see `/Users/matthew/Projects/DevSwarm/README.md`.

## Table Of Contents
- [1. Operating Principles](#1-operating-principles)
- [2. Canonical Architecture And Ownership](#2-canonical-architecture-and-ownership)
- [3. Service Boundaries](#3-service-boundaries)
- [4. Contract Invariants](#4-contract-invariants)
- [5. State And Eventing Model](#5-state-and-eventing-model)
- [6. Queue, Dispatcher, And Execution Semantics](#6-queue-dispatcher-and-execution-semantics)
- [7. API Surfaces And Routing Rules](#7-api-surfaces-and-routing-rules)
- [8. Auth And Security Expectations](#8-auth-and-security-expectations)
- [9. Environment Variable Contract](#9-environment-variable-contract)
- [10. Change Playbooks](#10-change-playbooks)
- [11. Debugging Runbooks](#11-debugging-runbooks)
- [12. Testing Strategy And Gates](#12-testing-strategy-and-gates)
- [13. Reliability Pitfalls And Failure Modes](#13-reliability-pitfalls-and-failure-modes)
- [14. Pre-Merge Checklist](#14-pre-merge-checklist)

## 1. Operating Principles
1. **Code is source of truth.**
   - If docs or comments conflict with runtime behavior, follow code and update docs.
2. **Gateway contract first.**
   - Browser clients should target Go gateway (`/api/*`, `/ws`) rather than AI engine directly.
3. **State-change visibility is mandatory.**
   - Mutations must trigger version increments and real-time propagation paths.
4. **Cross-layer consistency is required.**
   - Any model/contract changes must be reflected in backend, frontend normalization/store, and tests.
5. **Prefer additive evolution.**
   - Avoid breaking payload compatibility unless all consumers are updated in one change.

## 2. Canonical Architecture And Ownership
### Services
- Frontend: `/Users/matthew/Projects/DevSwarm/frontend`
- Gateway/backend: `/Users/matthew/Projects/DevSwarm/backend`
- AI engine: `/Users/matthew/Projects/DevSwarm/ai-engine`
- Schema: `/Users/matthew/Projects/DevSwarm/database/init.sql`

### Primary ownership boundaries
- **Frontend owns**:
  - Presentation, interaction model, client-side auth simulation, local state normalization.
- **Gateway owns**:
  - Browser-facing API contract, WebSocket fan-out, auth middleware, proxy mediation.
- **AI engine owns**:
  - Orchestration behavior, agent lifecycle logic, task queue worker/dispatcher, MCP exposure.
- **Postgres owns**:
  - durable state and versioned snapshots.
- **Redis owns**:
  - delta pub/sub and task queue stream.

## 3. Service Boundaries
## Frontend boundary
- Consume gateway routes and WS only.
- Normalize mixed payload casing through `frontend/src/lib/types.ts`.
- Apply state updates through `frontend/src/lib/store.ts`.

## Gateway boundary
- Expose `/health`, `/ws`, and `/api/*`.
- Enforce auth middleware for `/api/*` except health.
- Publish to WebSocket clients through hub broadcast channel.
- Proxy selected AI-engine functionality through `internal/api/proxy.go`.

## AI engine boundary
- Maintain orchestration and agent execution graph.
- Persist state via `database.py`.
- Publish deltas and state-changed notifications via `redis_client.py`.
- Run queue worker + dispatcher during FastAPI lifespan.

## 4. Contract Invariants
## Required endpoint set (gateway)
Must remain available unless deliberately versioned and migrated:
- `/health`, `/ws`
- `/api/health`
- `/api/agents`, `/api/agents/{id}`
- `/api/tasks`, `/api/tasks/{id}/status`
- `/api/messages`
- `/api/state`, `/api/state/override`
- `/api/costs`
- `/api/activity`
- `/api/trigger`
- `/api/simulate/activity`, `/api/simulate/demo-day`
- `/api/mcp/tools`

## WebSocket payload invariants
- `STATE_UPDATE` and `DELTA_UPDATE` frame types must be supported.
- `STATE_UPDATE` includes at minimum:
  - `type`, `agents`, `version`
  - optional `messages`, `tasks`
- `DELTA_UPDATE` includes at minimum:
  - `type`, `category`, `id`, `data`

## Auth invariants (current implementation)
- Static bearer token expected by both gateway and AI engine protected routes:
  - `Bearer devswarm-secret-key`
- Frontend simulated auth (`AuthProvider`) is independent of API bearer validation.

## Naming/casing invariants
- Incoming payloads may be snake_case or camelCase.
- Frontend normalizers must continue accepting both forms.

## 5. State And Eventing Model
## Canonical state pipeline
1. Mutation occurs (gateway handler, AI engine operation, agent execution).
2. PostgreSQL records are updated.
3. `office_state.version` is incremented.
4. Redis notification path (if available):
   - `devswarm:state_changed` or `devswarm:agent_events`.
5. Gateway poller receives event and either:
   - forwards delta payload directly, or
   - fetches full state and broadcasts `STATE_UPDATE`.

## Version semantics
- The gateway poller compares current version to last seen.
- Broadcast only occurs when version changes (or forced broadcast).

## Delta semantics
- AI engine publishes entity-level deltas via `publish_delta(category, id, data)`.
- Gateway forwards these as raw WS frames to clients.
- Frontend store merges/deduplicates by entity type.

## 6. Queue, Dispatcher, And Execution Semantics
## Trigger path
- `/api/trigger` in AI engine attempts Redis stream enqueue first.
- If enqueue fails, it falls back to in-process async graph execution.

## Queue worker
- `TaskQueueWorker` reads `devswarm:task_queue` via consumer group.
- Executes graph run for each goal.
- ACKs task after processing.
- Logs queue errors to `activity_log`.

## Dispatcher behavior
- `AgentTaskDispatcher` periodically scans idle agents.
- Per-agent lock prevents concurrent queue drains.
- Task transitions:
  - pending -> `In Progress`
  - then `Review` -> `Done`
  - error path -> `Blocked`
- Sends completion/failure summary messages to orchestrator/user channels.

## Primary-task finalization
- Graph execution service finalizes first delegated task and then dispatches idle agents for remaining tasks.

## 7. API Surfaces And Routing Rules
## Gateway routes and handlers
- Router source: `backend/internal/api/router.go`
- Handler source: `backend/internal/api/handlers.go`
- Proxy source: `backend/internal/api/proxy.go`

## Proxy routing rules
- Proxy target uses `AI_ENGINE_URL` (default `http://localhost:8000`).
- Proxy strips upstream CORS headers to avoid merged/conflicting browser values.

## AI engine routes
- Source: `ai-engine/main.py`
- Exposes overlapping `/api/*` surface when accessed directly.
- Gateway remains intended browser-facing ingress.

## Frontend API access model
- Client helper: `frontend/src/lib/api.ts`.
- Uses fallback candidates (configured env, same-origin rewrite, localhost direct).
- Adds static Authorization header for protected routes.

## 8. Auth And Security Expectations
## Current state
- Demo-grade auth model with known non-production defaults:
  - static bearer token
  - simulated login users in frontend
  - broad CORS defaults
  - permissive WebSocket origin checks

## Required guidance for maintainers
- Do not treat current auth as production-safe.
- Do not commit secrets in docs, tests, or examples.
- Use env variable names only in committed documentation.
- If changing auth behavior, update all of:
  - gateway middleware
  - AI engine middleware
  - frontend API client
  - tests and docs

## 9. Environment Variable Contract
## Core variables
- Infra:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- DB:
  - `DATABASE_URL`, `DATABASE_URL_GO`
- AI/model:
  - `GOOGLE_API_KEY`
- Cache/queue:
  - `REDIS_URL`
- Service wiring:
  - `AI_ENGINE_URL`
  - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`
  - `API_INTERNAL_URL`, `BACKEND_ORIGIN`
- Runtime extras:
  - `PORT`, `API_AUTH_TOKEN`, `WORKER_NAME`

## Variable resolution notes
- Backend DB connection prefers `DATABASE_URL_GO`, then `DATABASE_URL`.
- Frontend rewrites derive destination from `API_INTERNAL_URL`/`BACKEND_ORIGIN`/`NEXT_PUBLIC_API_URL` fallback chain.
- AI engine defaults Redis and DB URLs if env not set.

## 10. Change Playbooks
## A) Add a new field to agent/task/message/state models
1. Update DB schema and query/select/write paths.
   - `database/init.sql`
   - `backend/internal/db/queries.go`
   - `ai-engine/database.py`
2. Update backend state model JSON tags.
   - `backend/internal/state/models.go`
3. Update frontend types + normalizers.
   - `frontend/src/lib/types.ts`
4. Update frontend store merge logic if needed.
   - `frontend/src/lib/store.ts`
5. Update tests:
   - backend serialization/tests
   - frontend normalization/store tests
   - AI engine model/serialization tests
6. Update README and this CLAUDE handbook if contract changes are externally visible.

## B) Add or modify an API endpoint
1. Gateway:
   - `backend/internal/api/router.go`
   - `backend/internal/api/handlers.go` or `backend/internal/api/proxy.go`
2. AI engine (if endpoint is AI-owned):
   - `ai-engine/main.py`
3. Frontend client usage:
   - `frontend/src/lib/api.ts`
4. Test coverage:
   - backend handler/proxy/integration tests
   - AI engine endpoint tests
   - frontend API utility tests
5. Document route in README endpoint tables.

## C) Add a new agent
1. Create agent package:
   - `ai-engine/agents/<agent_id>/agent.py`
   - `.../prompts.py`
   - `.../tools.py`
2. Add output schema if needed:
   - `ai-engine/core/schemas.py`
3. Register in agent registry:
   - `ai-engine/agents/__init__.py`
4. Update graph routing if required:
   - `ai-engine/graph.py`
5. Seed metadata/tooling expectations in DB seed if needed:
   - `database/init.sql`
6. Add tests:
   - agent-specific deterministic tests
   - probabilistic tests if applicable
7. Update README agent and tool catalog sections.

## D) Change task lifecycle behavior
1. Update statuses/transition logic:
   - `ai-engine/services/agent_dispatcher.py`
   - optionally DB enums in `database/init.sql`
2. Confirm frontend status views support new states:
   - `frontend/src/lib/types.ts`
   - `frontend/src/components/KanbanBoard.tsx`
   - `frontend/src/app/(dashboard)/kanban/page.tsx`
3. Update gateway/AI handlers if request validation or status parsing changes.
4. Add/adjust tests for transition semantics.

## E) Change WebSocket payload format
1. Update producer payload structs/builders:
   - `backend/internal/state/models.go`
   - `backend/internal/db/queries.go` (payload assembly)
   - `ai-engine/redis_client.py` (delta payload shape)
2. Update frontend consumers:
   - `frontend/src/lib/store.ts`
   - `frontend/src/lib/types.ts`
3. Verify reconnect and parsing behavior tests:
   - `frontend/__tests__/lib/websocket.test.ts`
   - `frontend/__tests__/lib/store.test.ts`
4. Update README payload examples and contract notes.

## 11. Debugging Runbooks
## Start stack
```bash
cd /Users/matthew/Projects/DevSwarm
docker compose up -d --build
```

## Start services locally (infra via compose)
```bash
cd /Users/matthew/Projects/DevSwarm
docker compose up -d db redis

cd /Users/matthew/Projects/DevSwarm/ai-engine
uvicorn main:app --reload --port 8000

cd /Users/matthew/Projects/DevSwarm/backend
go run main.go

cd /Users/matthew/Projects/DevSwarm/frontend
npm run dev
```

## Health checks
```bash
curl http://localhost:8080/health
curl http://localhost:8000/health
```

## Authenticated API probes
```bash
curl -H 'Authorization: Bearer devswarm-secret-key' http://localhost:8080/api/agents
curl -H 'Authorization: Bearer devswarm-secret-key' http://localhost:8080/api/state
curl -H 'Authorization: Bearer devswarm-secret-key' http://localhost:8080/api/mcp/tools
```

## Trigger orchestration
```bash
curl -X POST http://localhost:8080/api/trigger \
  -H 'Authorization: Bearer devswarm-secret-key' \
  -H 'Content-Type: application/json' \
  -d '{"goal":"Run a system health and research cycle"}'
```

## Trigger simulations
```bash
curl -X POST http://localhost:8080/api/simulate/activity \
  -H 'Authorization: Bearer devswarm-secret-key' \
  -H 'Content-Type: application/json' -d '{}'

curl -X POST http://localhost:8080/api/simulate/demo-day \
  -H 'Authorization: Bearer devswarm-secret-key' \
  -H 'Content-Type: application/json' -d '{}'
```

## Scripted demo day (AI engine direct)
```bash
cd /Users/matthew/Projects/DevSwarm/ai-engine
python simulate_day.py --demo
```

## 12. Testing Strategy And Gates
## Frontend gate
```bash
cd /Users/matthew/Projects/DevSwarm/frontend
npm run lint
npm test
```

## Backend gate
```bash
cd /Users/matthew/Projects/DevSwarm/backend
go test ./... -v
go vet ./...
```

## AI engine gate
```bash
cd /Users/matthew/Projects/DevSwarm/ai-engine
ruff check .
mypy .
pytest tests/ -v
```

## High-value targeted suites
```bash
# probabilistic behavior
pytest tests/agents/test_agent_probabilistic.py -v

# orchestration + dispatcher paths
pytest tests/system/test_orchestration.py -v
pytest tests/test_task_dispatcher.py -v

# backend contract validation (requires gateway up)
pytest tests/contracts/test_backend_contract.py -v
```

## 13. Reliability Pitfalls And Failure Modes
## Redis unavailable
- Symptoms:
  - no immediate delta updates
  - slower UI convergence
- Why:
  - falls back to DB polling heartbeat in gateway poller.
- Actions:
  - verify Redis health and `REDIS_URL`
  - inspect backend logs for fallback warning.

## Queue enqueue failure in AI engine
- Behavior:
  - `/api/trigger` falls back to direct async execution.
- Risk:
  - less durable than stream-backed queueing.

## Testcontainers dependency (backend integration)
- `backend/internal/api/integration_test.go` requires Docker daemon access.

## Contract test assumptions (AI engine)
- `tests/contracts/test_backend_contract.py` skips when backend is not reachable.
- Do not treat skipped contract tests as pass for release confidence.

## Proxy CORS mediation
- Gateway strips upstream CORS headers in proxy path.
- If CORS behavior changes, revalidate browser behavior and proxy tests.

## Payload casing drift
- Mixed snake/camel payloads are tolerated in frontend normalization.
- Breaking normalization paths causes subtle UI regressions.

## 14. Pre-Merge Checklist
1. Endpoint behavior verified against router + handlers.
2. Any model changes reflected in backend + frontend + AI engine.
3. State mutation paths still increment version and propagate events.
4. Redis-down fallback still behaves correctly.
5. Required tests run for touched surfaces.
6. Docs updated:
   - `/Users/matthew/Projects/DevSwarm/README.md`
   - `/Users/matthew/Projects/DevSwarm/CLAUDE.md`
7. No secrets or real credentials introduced in tracked files.
