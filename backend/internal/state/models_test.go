// backend/internal/state/models_test.go
// Unit tests for JSON serialization/deserialization of all domain models.
package state

import (
	"encoding/json"
	"testing"
	"time"
)

func TestAgentJSON(t *testing.T) {
	now := time.Now().Truncate(time.Second)
	agent := Agent{
		ID: "marco", Name: "Marco", Role: "CEO",
		CurrentRoom: "War Room", Status: "Working",
		CurrentTask: "Delegation", ThoughtChain: "Analyzing...",
		TechStack: []string{"Python", "Go"}, AvatarColor: "#6366f1",
		UpdatedAt: now,
	}

	data, err := json.Marshal(agent)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var restored Agent
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if restored.ID != "marco" {
		t.Errorf("ID: got %q, want %q", restored.ID, "marco")
	}
	if restored.CurrentRoom != "War Room" {
		t.Errorf("CurrentRoom: got %q, want %q", restored.CurrentRoom, "War Room")
	}
	if len(restored.TechStack) != 2 {
		t.Errorf("TechStack: got %d items, want 2", len(restored.TechStack))
	}
}

func TestAgentJSONFieldNames(t *testing.T) {
	agent := Agent{ID: "test", Name: "Test", CurrentRoom: "Desks"}
	data, _ := json.Marshal(agent)

	var m map[string]interface{}
	json.Unmarshal(data, &m)

	expectedFields := []string{"id", "name", "role", "room", "status", "currentTask", "thoughtChain", "techStack", "avatarColor", "updatedAt"}
	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("Missing expected JSON field: %s", field)
		}
	}
}

func TestTaskJSON(t *testing.T) {
	task := Task{
		ID: "1", Title: "Research AI", Description: "Deep dive",
		Status: "In Progress", Priority: 5, CreatedBy: "marco",
		AssignedAgents: []string{"mona", "jimmy"},
	}

	data, err := json.Marshal(task)
	if err != nil {
		t.Fatalf("Marshal failed: %v", err)
	}

	var restored Task
	json.Unmarshal(data, &restored)

	if restored.Title != "Research AI" {
		t.Errorf("Title: got %q, want %q", restored.Title, "Research AI")
	}
	if len(restored.AssignedAgents) != 2 {
		t.Errorf("AssignedAgents: got %d, want 2", len(restored.AssignedAgents))
	}
}

func TestCreateTaskRequestJSON(t *testing.T) {
	jsonStr := `{"title":"Build API","description":"REST endpoints","status":"Backlog","priority":3,"createdBy":"marco","assignedAgents":["bob","jimmy"]}`

	var req CreateTaskRequest
	if err := json.Unmarshal([]byte(jsonStr), &req); err != nil {
		t.Fatalf("Unmarshal failed: %v", err)
	}

	if req.Title != "Build API" {
		t.Errorf("Title: got %q", req.Title)
	}
	if req.Priority != 3 {
		t.Errorf("Priority: got %d", req.Priority)
	}
	if len(req.AssignedAgents) != 2 {
		t.Errorf("AssignedAgents: got %d", len(req.AssignedAgents))
	}
}

func TestMessageJSON(t *testing.T) {
	msg := Message{
		ID: "1", FromAgent: "marco", ToAgent: "mona",
		Content: "Go research", MessageType: "delegation",
	}

	data, _ := json.Marshal(msg)
	var restored Message
	json.Unmarshal(data, &restored)

	if restored.FromAgent != "marco" {
		t.Errorf("FromAgent: got %q", restored.FromAgent)
	}
	if restored.MessageType != "delegation" {
		t.Errorf("MessageType: got %q", restored.MessageType)
	}
}

func TestCreateMessageRequestJSON(t *testing.T) {
	jsonStr := `{"fromAgent":"bob","toAgent":"marco","content":"System healthy","messageType":"status_report"}`

	var req CreateMessageRequest
	json.Unmarshal([]byte(jsonStr), &req)

	if req.FromAgent != "bob" || req.ToAgent != "marco" {
		t.Errorf("Agent fields incorrect: from=%q, to=%q", req.FromAgent, req.ToAgent)
	}
}

func TestAgentCostJSON(t *testing.T) {
	cost := AgentCost{
		AgentID: "mona", InputTokens: 5000,
		OutputTokens: 2000, CostUSD: 0.025,
	}

	data, _ := json.Marshal(cost)
	var m map[string]interface{}
	json.Unmarshal(data, &m)

	// Verify the JSON field names match frontend contract
	if _, ok := m["agentId"]; !ok {
		t.Error("Missing 'agentId' field")
	}
	if _, ok := m["totalInput"]; !ok {
		t.Error("Missing 'totalInput' field")
	}
	if _, ok := m["totalCost"]; !ok {
		t.Error("Missing 'totalCost' field")
	}
}

func TestActivityEntryJSON(t *testing.T) {
	entry := ActivityEntry{
		ID: "1", AgentID: "marco", Action: "task_created",
		Details: map[string]interface{}{"task_id": "42", "title": "Research"},
	}

	data, _ := json.Marshal(entry)
	var restored ActivityEntry
	json.Unmarshal(data, &restored)

	if restored.Action != "task_created" {
		t.Errorf("Action: got %q", restored.Action)
	}
	if restored.Details["task_id"] != "42" {
		t.Error("Details not properly round-tripped")
	}
}

func TestWSPayloadJSON(t *testing.T) {
	payload := WSPayload{
		Type:    "STATE_UPDATE",
		Agents:  map[string]Agent{"marco": {ID: "marco", Name: "Marco"}},
		Version: 42,
	}

	data, _ := json.Marshal(payload)
	var restored WSPayload
	json.Unmarshal(data, &restored)

	if restored.Type != "STATE_UPDATE" {
		t.Errorf("Type: got %q", restored.Type)
	}
	if restored.Version != 42 {
		t.Errorf("Version: got %d", restored.Version)
	}
	if _, ok := restored.Agents["marco"]; !ok {
		t.Error("Marco agent not in map")
	}
}

func TestWSPayloadOmitsEmptyLists(t *testing.T) {
	payload := WSPayload{Type: "STATE_UPDATE", Agents: map[string]Agent{}, Version: 1}

	data, _ := json.Marshal(payload)
	var m map[string]interface{}
	json.Unmarshal(data, &m)

	// Messages and Tasks should be omitted (omitempty)
	if _, ok := m["messages"]; ok {
		t.Error("messages should be omitted when empty/nil")
	}
	if _, ok := m["tasks"]; ok {
		t.Error("tasks should be omitted when empty/nil")
	}
}

func TestStateOverrideRequestJSON(t *testing.T) {
	jsonStr := `{"global_status":"Clocked Out","default_room":"Desks","message":"End of day"}`

	var req StateOverrideRequest
	json.Unmarshal([]byte(jsonStr), &req)

	if req.GlobalStatus != "Clocked Out" {
		t.Errorf("GlobalStatus: got %q", req.GlobalStatus)
	}
	if req.DefaultRoom != "Desks" {
		t.Errorf("DefaultRoom: got %q", req.DefaultRoom)
	}
}

func TestAgentUpdateRequestJSON(t *testing.T) {
	status := "Working"
	room := "War Room"
	req := AgentUpdateRequest{Status: &status, CurrentRoom: &room}

	data, _ := json.Marshal(req)
	var m map[string]interface{}
	json.Unmarshal(data, &m)

	if _, ok := m["status"]; !ok {
		t.Error("status should be present")
	}
	if _, ok := m["current_room"]; !ok {
		t.Error("current_room should be present")
	}
}

func TestAgentUpdateRequestNilFields(t *testing.T) {
	req := AgentUpdateRequest{}

	data, _ := json.Marshal(req)
	var m map[string]interface{}
	json.Unmarshal(data, &m)

	// With omitempty, nil pointer fields should be omitted
	if _, ok := m["status"]; ok {
		t.Error("nil status should be omitted")
	}
}

func TestAgentNilTechStack(t *testing.T) {
	agent := Agent{ID: "test", Name: "Test"}

	data, _ := json.Marshal(agent)
	var restored Agent
	json.Unmarshal(data, &restored)

	// Should handle nil TechStack gracefully
	if len(restored.TechStack) != 0 {
		t.Errorf("Expected nil or empty TechStack, got %v", restored.TechStack)
	}
}
