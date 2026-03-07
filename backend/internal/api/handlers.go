// backend/internal/api/handlers.go
// REST API handlers for agents, tasks, messages, costs, and state.
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"devswarm-backend/internal/cache"
	"devswarm-backend/internal/db"
	"devswarm-backend/internal/state"

	"github.com/go-chi/chi/v5"
)

// Handler handles API requests using a database repository.
type Handler struct {
	repo *db.Repository
}

// NewHandler creates a new Handler with the given repository.
func NewHandler(repo *db.Repository) *Handler {
	return &Handler{repo: repo}
}

// respondJSON writes a JSON response.
func (h *Handler) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError writes a JSON error response.
func (h *Handler) respondError(w http.ResponseWriter, status int, message string) {
	h.respondJSON(w, status, map[string]string{"error": message})
}

// HealthCheck returns the server status and verifies DB connectivity.
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	dbStatus := "ok"
	if err := h.repo.Ping(ctx); err != nil {
		dbStatus = "error: " + err.Error()
	}

	status := http.StatusOK
	if dbStatus != "ok" {
		status = http.StatusServiceUnavailable
	}

	h.respondJSON(w, status, map[string]string{
		"status":   "ok",
		"service":  "devswarm-backend",
		"database": dbStatus,
	})
}

// --- Agent Handlers ---

// ListAgents returns all agents.
func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	agents, err := h.repo.GetAllAgents(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	h.respondJSON(w, http.StatusOK, agents)
}

// GetAgent returns a single agent by ID.
func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	agent, err := h.repo.GetAgent(r.Context(), id)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Agent not found")
		return
	}
	h.respondJSON(w, http.StatusOK, agent)
}

// UpdateAgent updates an agent's state.
func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req state.AgentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	agent, err := h.repo.GetAgent(r.Context(), id)
	if err != nil {
		h.respondError(w, http.StatusNotFound, "Agent not found")
		return
	}

	// Apply partial updates
	if req.CurrentRoom != nil {
		agent.CurrentRoom = *req.CurrentRoom
	}
	if req.Status != nil {
		agent.Status = *req.Status
	}
	if req.CurrentTask != nil {
		agent.CurrentTask = *req.CurrentTask
	}
	if req.ThoughtChain != nil {
		agent.ThoughtChain = *req.ThoughtChain
	}

	if err := h.repo.UpdateAgent(r.Context(), agent); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Bump state version to trigger WebSocket broadcast
	h.repo.IncrementStateVersion(r.Context())

	// Log the activity
	h.repo.LogActivity(r.Context(), id, "agent_updated", map[string]interface{}{
		"room": agent.CurrentRoom, "status": agent.Status, "task": agent.CurrentTask,
	})

	h.respondJSON(w, http.StatusOK, agent)

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// --- Task Handlers ---

// ListTasks returns all tasks with optional agent filter.
func (h *Handler) ListTasks(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agent_id")

	var tasks []state.Task
	var err error

	if agentID != "" {
		tasks, err = h.repo.GetTasksByAgent(r.Context(), agentID)
	} else {
		tasks, err = h.repo.GetAllTasks(r.Context())
	}

	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if tasks == nil {
		tasks = []state.Task{}
	}

	h.respondJSON(w, http.StatusOK, tasks)
}

// CreateTask creates a new task.
func (h *Handler) CreateTask(w http.ResponseWriter, r *http.Request) {
	var req state.CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" {
		h.respondError(w, http.StatusBadRequest, "Title is required")
		return
	}

	if req.Status == "" {
		req.Status = "Backlog"
	}

	id, err := h.repo.CreateTask(r.Context(), &req)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.IncrementStateVersion(r.Context())
	h.repo.LogActivity(r.Context(), req.CreatedBy, "task_created", map[string]interface{}{
		"task_id": id, "title": req.Title,
	})

	h.respondJSON(w, http.StatusCreated, map[string]string{"id": id})

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// UpdateTaskStatus changes a task's kanban status.
func (h *Handler) UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.repo.UpdateTaskStatus(r.Context(), id, req.Status); err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.IncrementStateVersion(r.Context())

	h.respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// --- Message Handlers ---

// ListMessages returns recent messages.
func (h *Handler) ListMessages(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	agentID := r.URL.Query().Get("agent_id")

	messages, err := h.repo.GetRecentMessages(r.Context(), limit, agentID)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if messages == nil {
		messages = []state.Message{}
	}
	h.respondJSON(w, http.StatusOK, messages)
}

// CreateMessage creates a new inter-agent message.
func (h *Handler) CreateMessage(w http.ResponseWriter, r *http.Request) {
	var req state.CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	id, err := h.repo.CreateMessage(r.Context(), &req)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	h.repo.IncrementStateVersion(r.Context())

	h.respondJSON(w, http.StatusCreated, map[string]string{"id": id})

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// --- State Handlers ---

// GetState returns the full current state.
func (h *Handler) GetState(w http.ResponseWriter, r *http.Request) {
	data, _, err := h.repo.GetFullState(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// OverrideState allows forcing global state changes.
func (h *Handler) OverrideState(w http.ResponseWriter, r *http.Request) {
	var req state.StateOverrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.GlobalStatus != "" && req.DefaultRoom != "" {
		if err := h.repo.BulkUpdateAgentStatus(r.Context(), req.GlobalStatus, req.DefaultRoom); err != nil {
			h.respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	h.repo.LogActivity(r.Context(), "system", "state_override", map[string]interface{}{
		"status": req.GlobalStatus, "room": req.DefaultRoom, "message": req.Message,
	})

	h.respondJSON(w, http.StatusOK, map[string]string{"status": "overridden"})
}

// --- Cost Handlers ---

// GetCosts returns aggregated costs per agent.
func (h *Handler) GetCosts(w http.ResponseWriter, r *http.Request) {
	costs, err := h.repo.GetAgentCosts(r.Context())
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if costs == nil {
		costs = []state.AgentCost{}
	}
	h.respondJSON(w, http.StatusOK, costs)
}

// --- Activity Log Handlers ---

// GetActivityLog returns recent activity entries.
func (h *Handler) GetActivityLog(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}

	entries, err := h.repo.GetActivityLog(r.Context(), limit)
	if err != nil {
		h.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if entries == nil {
		entries = []state.ActivityEntry{}
	}
	h.respondJSON(w, http.StatusOK, entries)
}
