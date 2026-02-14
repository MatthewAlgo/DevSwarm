// backend/internal/db/db.go
// Database connection pool using pgx.
package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

// Connect initializes the database connection pool.
func Connect() error {
	// Prefer DATABASE_URL_GO (Go-specific with sslmode), fallback to DATABASE_URL
	dsn := os.Getenv("DATABASE_URL_GO")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		return fmt.Errorf("neither DATABASE_URL_GO nor DATABASE_URL environment variable is set")
	}

	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("failed to parse database URL: %w", err)
	}

	config.MaxConns = 20
	config.MinConns = 2
	config.MaxConnLifetime = 30 * time.Minute
	config.MaxConnIdleTime = 5 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	Pool = pool
	log.Printf("[DB] Connected to PostgreSQL (max=%d, min=%d)", config.MaxConns, config.MinConns)
	return nil
}

// Ping checks database connectivity. Used by health endpoint.
func Ping(ctx context.Context) error {
	if Pool == nil {
		return fmt.Errorf("pool is nil")
	}
	return Pool.Ping(ctx)
}

// Close gracefully shuts down the connection pool.
func Close() {
	if Pool != nil {
		Pool.Close()
		log.Println("[DB] Connection pool closed")
	}
}
