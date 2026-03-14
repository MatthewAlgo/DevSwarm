// backend/internal/api/router.go
// Chi router setup with all API routes and WebSocket endpoint.
package api

import (
	"net/http"
	"time"

	"devswarm-backend/internal/db"
	"devswarm-backend/internal/hub"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// NewRouter creates and configures the Chi router with all routes.
func NewRouter(h *hub.Hub, repo *db.Repository) *chi.Mux {
	r := chi.NewRouter()
	handlers := NewHandler(repo)

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

	// WebSocket endpoint
	r.Get("/ws", func(w http.ResponseWriter, r *http.Request) {
		hub.ServeWs(h, w, r)
	})

	// Public health alias for infra checks
	r.Get("/health", handlers.HealthCheck)

	// Prometheus metrics
	r.Get("/metrics", promhttp.Handler().ServeHTTP)

	// REST API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(JSONContentType)
		r.Use(AuthMiddleware)

		// Health
		r.Get("/health", handlers.HealthCheck)

		// Agents
		r.Route("/agents", func(r chi.Router) {
			r.Get("/", handlers.ListAgents)
			r.Get("/{id}", handlers.GetAgent)
			r.Patch("/{id}", handlers.UpdateAgent)
		})

		// Tasks (Kanban)
		r.Route("/tasks", func(r chi.Router) {
			r.Get("/", handlers.ListTasks)
			r.Post("/", handlers.CreateTask)
			r.Patch("/{id}/status", handlers.UpdateTaskStatus)
		})

		// Messages (inter-agent communication)
		r.Route("/messages", func(r chi.Router) {
			r.Get("/", handlers.ListMessages)
			r.Post("/", handlers.CreateMessage)
		})

		// State
		r.Route("/state", func(r chi.Router) {
			r.Get("/", handlers.GetState)
			r.Post("/override", handlers.OverrideState)
		})

		// Costs
		r.Get("/costs", handlers.GetCosts)

		// Proxy AI functionality to Python Engine
		r.Post("/trigger", handlers.ProxyToPython)
		r.Route("/simulate", func(r chi.Router) {
			r.Post("/activity", handlers.ProxyToPython)
			r.Post("/demo-day", handlers.ProxyToPython)
		})
		r.Route("/mcp", func(r chi.Router) {
			r.Get("/tools", handlers.ProxyToPython)
		})

		// Activity Log
		r.Get("/activity", handlers.GetActivityLog)
	})

	return r
}
