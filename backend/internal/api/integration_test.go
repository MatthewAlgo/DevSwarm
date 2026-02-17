package api_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"devswarm-backend/internal/api"
	"devswarm-backend/internal/db"
	"devswarm-backend/internal/hub"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

var (
	testDB        *sql.DB
	testContainer *postgres.PostgresContainer
)

func TestMain(m *testing.M) {
	ctx := context.Background()

	// Start Postgres Container
	pgContainer, err := postgres.Run(ctx,
		"postgres:15-alpine",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		postgres.WithSQLDriver("pgx"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(5*time.Second)),
	)
	if err != nil {
		fmt.Printf("failed to start container: %s\n", err)
		os.Exit(1)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		fmt.Printf("failed to get connection string: %s\n", err)
		os.Exit(1)
	}

	// Connect to DB
	os.Setenv("DATABASE_URL", connStr)
	if err := db.Connect(); err != nil {
		fmt.Printf("failed to connect to db: %s\n", err)
		os.Exit(1)
	}

	// Run migrations (simplified for test: create table)
	// In production, use your migration tool.
	createTableSQL := `
	CREATE TABLE agents (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		role TEXT,
		current_room TEXT,
		status TEXT,
		current_task TEXT,
		thought_chain TEXT,
		tech_stack TEXT[],
		avatar_color TEXT,
		updated_at TIMESTAMP DEFAULT NOW()
	);
	INSERT INTO agents (id, name, role, current_room, status, current_task, thought_chain, tech_stack, avatar_color) 
	VALUES ('agent-1', 'Test Agent', 'Tester', 'Desks', 'Idle', '', '', '{}', '#000000');
	`
	_, err = db.Pool.Exec(ctx, createTableSQL)
	if err != nil {
		fmt.Printf("failed to run migration: %s\n", err)
		os.Exit(1)
	}

	code := m.Run()

	// Cleanup
	pgContainer.Terminate(ctx)
	os.Exit(code)
}

func TestListAgentsIntegration(t *testing.T) {
	// Setup Router
	h := hub.New()
	r := api.NewRouter(h)

	// Create Request
	req := httptest.NewRequest("GET", "/api/agents", nil)
	req.Header.Set("Authorization", "Bearer devswarm-secret-key")
	w := httptest.NewRecorder()

	// Execute
	r.ServeHTTP(w, req)

	// Assertions
	if w.Code != http.StatusOK {
		t.Logf("Response Body: %s", w.Body.String())
	}
	assert.Equal(t, http.StatusOK, w.Code)

	var agents []map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &agents)
	require.NoError(t, err)
	assert.NotEmpty(t, agents)
	assert.Equal(t, "Test Agent", agents[0]["name"])
}
