// backend/internal/state/models.go
// Domain models for DevSwarm state management.
package state

import "time"

// Agent represents an AI agent in the virtual office.
type Agent struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CurrentRoom  string    `json:"room"`
	Status       string    `json:"status"`
	CurrentTask  string    `json:"currentTask"`
	ThoughtChain string    `json:"thoughtChain"`
	TechStack    []string  `json:"techStack"`
	AvatarColor  string    `json:"avatarColor"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Task represents a Kanban task.
type Task struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	Status         string    `json:"status"`
	Priority       int       `json:"priority"`
	CreatedBy      string    `json:"createdBy"`
	AssignedAgents []string  `json:"assignedAgents"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// CreateTaskRequest is the payload for creating a new task.
type CreateTaskRequest struct {
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Status         string   `json:"status"`
	Priority       int      `json:"priority"`
	CreatedBy      string   `json:"createdBy"`
	AssignedAgents []string `json:"assignedAgents"`
}

// Message represents inter-agent communication.
type Message struct {
	ID          string    `json:"id"`
	FromAgent   string    `json:"fromAgent"`
	ToAgent     string    `json:"toAgent"`
	Content     string    `json:"content"`
	MessageType string    `json:"messageType"`
	CreatedAt   time.Time `json:"createdAt"`
}

// CreateMessageRequest is the payload for creating a new message.
type CreateMessageRequest struct {
	FromAgent   string `json:"fromAgent"`
	ToAgent     string `json:"toAgent"`
	Content     string `json:"content"`
	MessageType string `json:"messageType"`
}

// AgentCost represents aggregated token costs per agent.
// JSON field names match the frontend AgentCost interface.
type AgentCost struct {
	AgentID      string  `json:"agentId"`
	InputTokens  int     `json:"totalInput"`
	OutputTokens int     `json:"totalOutput"`
	CostUSD      float64 `json:"totalCost"`
}

// ActivityEntry is a single audit log entry.
type ActivityEntry struct {
	ID        string                 `json:"id"`
	AgentID   string                 `json:"agentId"`
	Action    string                 `json:"action"`
	Details   map[string]interface{} `json:"details"`
	CreatedAt time.Time              `json:"createdAt"`
}

// WSPayload is the full WebSocket broadcast payload.
type WSPayload struct {
	Type     string           `json:"type"`
	Agents   map[string]Agent `json:"agents"`
	Messages []Message        `json:"messages,omitempty"`
	Tasks    []Task           `json:"tasks,omitempty"`
	Version  int64            `json:"version"`
}

// StateOverrideRequest is used by the AI engine to force state changes.
type StateOverrideRequest struct {
	GlobalStatus string `json:"global_status"`
	DefaultRoom  string `json:"default_room"`
	Message      string `json:"message"`
}

// AgentUpdateRequest is the payload for updating a single agent's state.
type AgentUpdateRequest struct {
	CurrentRoom  *string `json:"current_room,omitempty"`
	Status       *string `json:"status,omitempty"`
	CurrentTask  *string `json:"current_task,omitempty"`
	ThoughtChain *string `json:"thought_chain,omitempty"`
}
