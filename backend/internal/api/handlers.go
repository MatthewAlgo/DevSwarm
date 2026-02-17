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

// respondJSON writes a JSON response.
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError writes a JSON error response.
func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// HealthCheck returns the server status and verifies DB connectivity.
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	dbStatus := "ok"
	if err := db.Ping(ctx); err != nil {
		dbStatus = "error: " + err.Error()
	}

	status := http.StatusOK
	if dbStatus != "ok" {
		status = http.StatusServiceUnavailable
	}

	respondJSON(w, status, map[string]string{
		"status":   "ok",
		"service":  "devswarm-backend",
		"database": dbStatus,
	})
}

// --- Agent Handlers ---

// ListAgents returns all agents.
func ListAgents(w http.ResponseWriter, r *http.Request) {
	agents, err := db.GetAllAgents(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, agents)
}

// GetAgent returns a single agent by ID.
func GetAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	agent, err := db.GetAgent(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Agent not found")
		return
	}
	respondJSON(w, http.StatusOK, agent)
}

// UpdateAgent updates an agent's state.
func UpdateAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req state.AgentUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	agent, err := db.GetAgent(r.Context(), id)
	if err != nil {
		respondError(w, http.StatusNotFound, "Agent not found")
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

	if err := db.UpdateAgent(r.Context(), agent); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Bump state version to trigger WebSocket broadcast
	db.IncrementStateVersion(r.Context())

	// Log the activity
	db.LogActivity(r.Context(), id, "agent_updated", map[string]interface{}{
		"room": agent.CurrentRoom, "status": agent.Status, "task": agent.CurrentTask,
	})

	respondJSON(w, http.StatusOK, agent)

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// --- Task Handlers ---

// ListTasks returns all tasks with optional agent filter.
func ListTasks(w http.ResponseWriter, r *http.Request) {
	agentID := r.URL.Query().Get("agent_id")

	var tasks []state.Task
	var err error

	if agentID != "" {
		tasks, err = db.GetTasksByAgent(r.Context(), agentID)
	} else {
		tasks, err = db.GetAllTasks(r.Context())
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if tasks == nil {
		tasks = []state.Task{}
	}

	respondJSON(w, http.StatusOK, tasks)
}

// CreateTask creates a new task.
func CreateTask(w http.ResponseWriter, r *http.Request) {
	var req state.CreateTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" {
		respondError(w, http.StatusBadRequest, "Title is required")
		return
	}

	if req.Status == "" {
		req.Status = "Backlog"
	}

	id, err := db.CreateTask(r.Context(), &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	db.IncrementStateVersion(r.Context())
	db.LogActivity(r.Context(), req.CreatedBy, "task_created", map[string]interface{}{
		"task_id": id, "title": req.Title,
	})

	respondJSON(w, http.StatusCreated, map[string]string{"id": id})

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// UpdateTaskStatus changes a task's kanban status.
func UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := db.UpdateTaskStatus(r.Context(), id, req.Status); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	db.IncrementStateVersion(r.Context())

	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// --- Message Handlers ---

// ListMessages returns recent messages with optional limit and agent filter.
func ListMessages(w http.ResponseWriter, r *http.Request) {
	limit := 50
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	agentID := r.URL.Query().Get("agent_id")

	messages, err := db.GetRecentMessages(r.Context(), limit, agentID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if messages == nil {
		messages = []state.Message{}
	}
	respondJSON(w, http.StatusOK, messages)
}

// CreateMessage creates a new inter-agent message.
func CreateMessage(w http.ResponseWriter, r *http.Request) {
	var req state.CreateMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	id, err := db.CreateMessage(r.Context(), &req)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	db.IncrementStateVersion(r.Context())

	respondJSON(w, http.StatusCreated, map[string]string{"id": id})

	// Notify Redis subscribers of state change
	cache.PublishStateChanged(r.Context())
}

// --- State Handlers ---

// GetState returns the full current state.
func GetState(w http.ResponseWriter, r *http.Request) {
	data, _, err := db.GetFullState(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// OverrideState allows the AI engine to force global state changes.
func OverrideState(w http.ResponseWriter, r *http.Request) {
	var req state.StateOverrideRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.GlobalStatus != "" && req.DefaultRoom != "" {
		if err := db.BulkUpdateAgentStatus(r.Context(), req.GlobalStatus, req.DefaultRoom); err != nil {
			respondError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	db.LogActivity(r.Context(), "system", "state_override", map[string]interface{}{
		"status": req.GlobalStatus, "room": req.DefaultRoom, "message": req.Message,
	})

	respondJSON(w, http.StatusOK, map[string]string{"status": "overridden"})
}

// --- Cost Handlers ---

// GetCosts returns aggregated costs per agent.
func GetCosts(w http.ResponseWriter, r *http.Request) {
	costs, err := db.GetAgentCosts(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if costs == nil {
		costs = []state.AgentCost{}
	}
	respondJSON(w, http.StatusOK, costs)
}

// --- Activity Log Handlers ---

// GetActivityLog returns recent activity entries.
func GetActivityLog(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}

	entries, err := db.GetActivityLog(r.Context(), limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if entries == nil {
		entries = []state.ActivityEntry{}
	}
	respondJSON(w, http.StatusOK, entries)
}
