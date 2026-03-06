// backend/internal/db/queries.go
// SQL query functions for agents, tasks, state, messages, and costs.
package db

import (
	"context"
	"encoding/json"
	"fmt"

	"devswarm-backend/internal/state"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository encapsulates database operations.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository creates a new database repository.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// scanAgent scans a row into an Agent, handling the TEXT[] tech_stack column.
func scanAgent(row pgx.Row) (state.Agent, error) {
	var a state.Agent
	err := row.Scan(
		&a.ID, &a.Name, &a.Role, &a.CurrentRoom, &a.Status,
		&a.CurrentTask, &a.ThoughtChain, &a.TechStack,
		&a.AvatarColor, &a.UpdatedAt,
	)
	if a.TechStack == nil {
		a.TechStack = []string{}
	}
	return a, err
}

const agentColumns = `
	id, name, role, current_room, status, current_task,
	thought_chain, tech_stack, avatar_color, updated_at`

// GetAllAgents returns all agents from the database.
func (r *Repository) GetAllAgents(ctx context.Context) ([]state.Agent, error) {
	rows, err := r.pool.Query(ctx, `SELECT `+agentColumns+` FROM agents ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	agents := make([]state.Agent, 0, 8)
	for rows.Next() {
		a, err := scanAgent(rows)
		if err != nil {
			return nil, err
		}
		agents = append(agents, a)
	}
	return agents, rows.Err()
}

// GetAgent returns a single agent by ID.
func (r *Repository) GetAgent(ctx context.Context, id string) (*state.Agent, error) {
	a, err := scanAgent(r.pool.QueryRow(ctx,
		`SELECT `+agentColumns+` FROM agents WHERE id = $1`, id))
	if err != nil {
		return nil, err
	}
	return &a, nil
}

// UpdateAgent updates an agent's mutable fields.
func (r *Repository) UpdateAgent(ctx context.Context, a *state.Agent) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE agents SET
			current_room = $1, status = $2, current_task = $3,
			thought_chain = $4, updated_at = NOW()
		WHERE id = $5
	`, a.CurrentRoom, a.Status, a.CurrentTask, a.ThoughtChain, a.ID)
	return err
}

// GetOfficeStateVersion returns the current state version number.
func (r *Repository) GetOfficeStateVersion(ctx context.Context) (int64, error) {
	var version int64
	err := r.pool.QueryRow(ctx, `SELECT version FROM office_state WHERE id = 1`).Scan(&version)
	return version, err
}

// GetFullState builds the complete state payload for WebSocket broadcast.
func (r *Repository) GetFullState(ctx context.Context) ([]byte, int64, error) {
	agents, err := r.GetAllAgents(ctx)
	if err != nil {
		return nil, 0, err
	}

	version, err := r.GetOfficeStateVersion(ctx)
	if err != nil {
		return nil, 0, err
	}

	messages, err := r.GetRecentMessages(ctx, 20, "")
	if err != nil {
		return nil, 0, err
	}

	tasks, err := r.GetAllTasks(ctx)
	if err != nil {
		return nil, 0, err
	}

	agentMap := make(map[string]state.Agent, len(agents))
	for _, a := range agents {
		agentMap[a.ID] = a
	}

	payload := state.WSPayload{
		Type:     "STATE_UPDATE",
		Agents:   agentMap,
		Messages: messages,
		Tasks:    tasks,
		Version:  version,
	}

	data, err := json.Marshal(payload)
	return data, version, err
}

// IncrementStateVersion bumps the version to trigger broadcasts.
func (r *Repository) IncrementStateVersion(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE office_state SET version = version + 1, updated_at = NOW() WHERE id = 1
	`)
	return err
}

// GetAllTasks returns all tasks with their assignees.
func (r *Repository) GetAllTasks(ctx context.Context) ([]state.Task, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.title, t.description, t.status, t.priority,
		       COALESCE(t.created_by, ''), t.created_at, t.updated_at
		FROM tasks t ORDER BY t.priority DESC, t.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]state.Task, 0)
	for rows.Next() {
		var t state.Task
		err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status,
			&t.Priority, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			return nil, err
		}
		t.AssignedAgents, _ = r.GetTaskAssignees(ctx, t.ID)
		if t.AssignedAgents == nil {
			t.AssignedAgents = []string{}
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// GetTasksByAgent returns tasks assigned to a specific agent.
func (r *Repository) GetTasksByAgent(ctx context.Context, agentID string) ([]state.Task, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.title, t.description, t.status, t.priority,
		       COALESCE(t.created_by, ''), t.created_at, t.updated_at
		FROM tasks t
		JOIN task_assignments ta ON t.id = ta.task_id
		WHERE ta.agent_id = $1
		ORDER BY t.priority DESC, t.created_at DESC
	`, agentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tasks := make([]state.Task, 0)
	for rows.Next() {
		var t state.Task
		err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.Status,
			&t.Priority, &t.CreatedBy, &t.CreatedAt, &t.UpdatedAt)
		if err != nil {
			return nil, err
		}
		t.AssignedAgents, _ = r.GetTaskAssignees(ctx, t.ID)
		if t.AssignedAgents == nil {
			t.AssignedAgents = []string{}
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// GetTaskAssignees returns the list of agent IDs assigned to a task.
func (r *Repository) GetTaskAssignees(ctx context.Context, taskID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT agent_id FROM task_assignments WHERE task_id = $1
	`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	agents := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		agents = append(agents, id)
	}
	return agents, rows.Err()
}

// CreateTask inserts a new task and returns its ID.
func (r *Repository) CreateTask(ctx context.Context, t *state.CreateTaskRequest) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO tasks (title, description, status, priority, created_by)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, t.Title, t.Description, t.Status, t.Priority, t.CreatedBy).Scan(&id)
	if err != nil {
		return "", err
	}

	for _, agentID := range t.AssignedAgents {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO task_assignments (task_id, agent_id) VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, id, agentID)
		if err != nil {
			return "", err
		}
	}

	return id, nil
}

// UpdateTaskStatus updates just the status of a task.
func (r *Repository) UpdateTaskStatus(ctx context.Context, taskID string, status string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2
	`, status, taskID)
	return err
}

// GetRecentMessages returns the N most recent messages.
func (r *Repository) GetRecentMessages(ctx context.Context, limit int, agentID string) ([]state.Message, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, COALESCE(from_agent, ''), COALESCE(to_agent, ''),
		       content, message_type, created_at
		FROM messages
	`
	args := []interface{}{limit}

	if agentID != "" {
		query += ` WHERE from_agent = $2 OR to_agent = $2`
		args = append(args, agentID)
	}

	query += ` ORDER BY created_at DESC LIMIT $1`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	messages := make([]state.Message, 0)
	for rows.Next() {
		var m state.Message
		err := rows.Scan(&m.ID, &m.FromAgent, &m.ToAgent, &m.Content,
			&m.MessageType, &m.CreatedAt)
		if err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}
	return messages, rows.Err()
}

// CreateMessage inserts a new inter-agent message.
func (r *Repository) CreateMessage(ctx context.Context, m *state.CreateMessageRequest) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, `
		INSERT INTO messages (from_agent, to_agent, content, message_type)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, m.FromAgent, m.ToAgent, m.Content, m.MessageType).Scan(&id)
	return id, err
}

// GetAgentCosts returns aggregated costs per agent.
func (r *Repository) GetAgentCosts(ctx context.Context) ([]state.AgentCost, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT agent_id,
		       SUM(input_tokens) as total_input,
		       SUM(output_tokens) as total_output,
		       SUM(cost_usd) as total_cost
		FROM agent_costs
		GROUP BY agent_id
		ORDER BY total_cost DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	costs := make([]state.AgentCost, 0)
	for rows.Next() {
		var c state.AgentCost
		err := rows.Scan(&c.AgentID, &c.InputTokens, &c.OutputTokens, &c.CostUSD)
		if err != nil {
			return nil, err
		}
		costs = append(costs, c)
	}
	return costs, rows.Err()
}

// RecordCost inserts a cost entry for an agent.
func (r *Repository) RecordCost(ctx context.Context, agentID string, input, output int, cost float64) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO agent_costs (agent_id, input_tokens, output_tokens, cost_usd)
		VALUES ($1, $2, $3, $4)
	`, agentID, input, output, cost)
	return err
}

// LogActivity records an action in the activity log.
func (r *Repository) LogActivity(ctx context.Context, agentID, action string, details interface{}) error {
	detailsJSON, _ := json.Marshal(details)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO activity_log (agent_id, action, details) VALUES ($1, $2, $3)
	`, agentID, action, detailsJSON)
	return err
}

// GetActivityLog returns recent activity entries.
func (r *Repository) GetActivityLog(ctx context.Context, limit int) ([]state.ActivityEntry, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, COALESCE(agent_id, ''), action, details, created_at
		FROM activity_log ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := make([]state.ActivityEntry, 0)
	for rows.Next() {
		var e state.ActivityEntry
		var detailsJSON []byte
		err := rows.Scan(&e.ID, &e.AgentID, &e.Action, &detailsJSON, &e.CreatedAt)
		if err != nil {
			return nil, err
		}
		if detailsJSON != nil {
			_ = json.Unmarshal(detailsJSON, &e.Details)
		}
		if e.Details == nil {
			e.Details = make(map[string]interface{})
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

// UpdateGlobalState updates the office_state JSON.
func (r *Repository) UpdateGlobalState(ctx context.Context, stateJSON map[string]interface{}) error {
	data, _ := json.Marshal(stateJSON)
	_, err := r.pool.Exec(ctx, `
		UPDATE office_state SET state_json = $1, version = version + 1, updated_at = NOW()
		WHERE id = 1
	`, data)
	return err
}

// BulkUpdateAgentStatus updates all agents to a given status and room.
func (r *Repository) BulkUpdateAgentStatus(ctx context.Context, status string, room string) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE agents SET status = $1, current_room = $2, updated_at = NOW()
	`, status, room)
	if err != nil {
		return err
	}
	return r.IncrementStateVersion(ctx)
}

// Ping checks database connectivity.
func (r *Repository) Ping(ctx context.Context) error {
	if r.pool == nil {
		return fmt.Errorf("pool is nil")
	}
	return r.pool.Ping(ctx)
}
