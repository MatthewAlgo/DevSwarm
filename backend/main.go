// backend/main.go
// DevSwarm Backend - Entry point.
// Initializes the database, WebSocket hub, state poller, and HTTP server.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"devswarm-backend/internal/api"
	"devswarm-backend/internal/cache"
	"devswarm-backend/internal/db"
	"devswarm-backend/internal/hub"
	"devswarm-backend/internal/state"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("=== DevSwarm Backend Starting ===")

	// Load .env for local development (no-op if missing, e.g. in Docker)
	_ = godotenv.Load("../.env")
	_ = godotenv.Load()

	// Connect to database
	if err := db.Connect(); err != nil {
		log.Fatalf("[Main] Database connection failed: %v", err)
	}
	defer db.Close()

	// Connect to Redis
	if err := cache.Connect(); err != nil {
		log.Printf("[Main] Redis connection failed (non-fatal, falling back to DB polling): %v", err)
	} else {
		defer cache.Close()
	}

	// Create WebSocket hub
	wsHub := hub.New()
	go wsHub.Run()
	log.Println("[Main] WebSocket Hub started")

	// Create and start state poller (30s heartbeat, Redis pub/sub handles instant updates)
	poller := state.NewPoller(wsHub.Broadcast, db.GetFullState, 30*time.Second)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go poller.Start(ctx)
	log.Println("[Main] State Poller started")

	// Create HTTP router
	router := api.NewRouter(wsHub)

	// Configure HTTP server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown handler
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("[Main] Shutdown signal received")
		cancel() // Stop the poller

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("[Main] Server shutdown error: %v", err)
		}
	}()

	log.Printf("[Main] DevSwarm Backend listening on :%s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[Main] Server error: %v", err)
	}

	log.Println("[Main] Server stopped gracefully")
}
