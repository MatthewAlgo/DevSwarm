// backend/internal/api/handlers_test.go
// Unit tests for REST API handler helper functions.
// Handler tests that require the database are tested at the integration level.
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRespondJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	respondJSON(rr, http.StatusOK, map[string]string{"status": "ok"})

	if rr.Code != http.StatusOK {
		t.Errorf("Status: got %d, want %d", rr.Code, http.StatusOK)
	}

	var body map[string]string
	json.NewDecoder(rr.Body).Decode(&body)

	if body["status"] != "ok" {
		t.Errorf("Body status: got %q, want %q", body["status"], "ok")
	}
}

func TestRespondJSONCreated(t *testing.T) {
	rr := httptest.NewRecorder()
	respondJSON(rr, http.StatusCreated, map[string]string{"id": "42"})

	if rr.Code != http.StatusCreated {
		t.Errorf("Status: got %d, want %d", rr.Code, http.StatusCreated)
	}
}

func TestRespondError(t *testing.T) {
	rr := httptest.NewRecorder()
	respondError(rr, http.StatusBadRequest, "Invalid input")

	if rr.Code != http.StatusBadRequest {
		t.Errorf("Status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}

	var body map[string]string
	json.NewDecoder(rr.Body).Decode(&body)

	if body["error"] != "Invalid input" {
		t.Errorf("Error: got %q, want %q", body["error"], "Invalid input")
	}
}

func TestRespondErrorNotFound(t *testing.T) {
	rr := httptest.NewRecorder()
	respondError(rr, http.StatusNotFound, "Agent not found")

	if rr.Code != http.StatusNotFound {
		t.Errorf("Status: got %d, want %d", rr.Code, http.StatusNotFound)
	}
}

func TestRespondErrorInternal(t *testing.T) {
	rr := httptest.NewRecorder()
	respondError(rr, http.StatusInternalServerError, "Database error")

	var body map[string]string
	json.NewDecoder(rr.Body).Decode(&body)

	if body["error"] != "Database error" {
		t.Errorf("Error: got %q", body["error"])
	}
}

func TestRespondJSONArray(t *testing.T) {
	rr := httptest.NewRecorder()
	data := []map[string]string{
		{"id": "1", "name": "Marco"},
		{"id": "2", "name": "Mona"},
	}
	respondJSON(rr, http.StatusOK, data)

	var body []map[string]string
	json.NewDecoder(rr.Body).Decode(&body)

	if len(body) != 2 {
		t.Errorf("Array length: got %d, want 2", len(body))
	}
}

func TestRespondJSONNestedObject(t *testing.T) {
	rr := httptest.NewRecorder()
	data := map[string]interface{}{
		"status": "ok",
		"data":   map[string]int{"count": 42},
	}
	respondJSON(rr, http.StatusOK, data)

	var body map[string]interface{}
	json.NewDecoder(rr.Body).Decode(&body)

	nested := body["data"].(map[string]interface{})
	if nested["count"].(float64) != 42 {
		t.Errorf("Nested count: got %v", nested["count"])
	}
}
