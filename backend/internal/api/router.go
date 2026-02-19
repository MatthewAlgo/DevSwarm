// backend/internal/api/router.go
// Chi router setup with all API routes and WebSocket endpoint.
package api

import (
	"net/http"
	"time"

	"devswarm-backend/internal/hub"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter creates and configures the Chi router with all routes.
func NewRouter(h *hub.Hub) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Timeout(30 * time.Second))
	r.Use(RequestLogger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:8080", "http://localhost:8000", "https://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// WebSocket endpoint (excluded from Timeout middleware naturally since
	// the websocket.Upgrader hijacks the connection)
	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		hub.ServeWs(h, w, r)
	})

	// Public health alias for infra checks that hit /health directly.
	r.Get("/health", HealthCheck)

	// REST API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(JSONContentType)
		r.Use(AuthMiddleware)

		// Health
		r.Get("/health", HealthCheck)

		// Agents
		r.Route("/agents", func(r chi.Router) {
			r.Get("/", ListAgents)
			r.Get("/{id}", GetAgent)
			r.Patch("/{id}", UpdateAgent)
		})

		// Tasks (Kanban)
		r.Route("/tasks", func(r chi.Router) {
			r.Get("/", ListTasks)
			r.Post("/", CreateTask)
			r.Patch("/{id}/status", UpdateTaskStatus)
		})

		// Messages (inter-agent communication)
		r.Route("/messages", func(r chi.Router) {
			r.Get("/", ListMessages)
			r.Post("/", CreateMessage)
		})

		// State
		r.Route("/state", func(r chi.Router) {
			r.Get("/", GetState)
			r.Post("/override", OverrideState)
		})

		// Costs
		r.Get("/costs", GetCosts)

		// Proxy specific AI functionality to Python Engine
		r.Post("/trigger", ProxyToPython)
		r.Route("/simulate", func(r chi.Router) {
			r.Post("/activity", ProxyToPython)
			r.Post("/demo-day", ProxyToPython)
		})
		r.Route("/mcp", func(r chi.Router) {
			r.Get("/tools", ProxyToPython)
			// Add other MCP routes here if needed
		})

		// Activity Log
		r.Get("/activity", GetActivityLog)
	})

	return r
}
