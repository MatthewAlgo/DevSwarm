// backend/internal/state/poller.go
// State poller watches the database for changes and triggers WebSocket broadcasts.
package state

import (
	"context"
	"log"
	"time"
)

// Poller watches the office_state version in the database and triggers
// broadcasts when the version changes.
type Poller struct {
	// Broadcast channel to push state updates to
	broadcast chan<- []byte

	// GetFullState fetches the complete state payload from the database
	getFullState func(ctx context.Context) ([]byte, int64, error)

	// Polling interval
	interval time.Duration

	// Last known version
	lastVersion int64
}

// NewPoller creates a new state poller.
func NewPoller(broadcast chan<- []byte, getFullState func(ctx context.Context) ([]byte, int64, error), interval time.Duration) *Poller {
	return &Poller{
		broadcast:    broadcast,
		getFullState: getFullState,
		interval:     interval,
		lastVersion:  -1,
	}
}

// Start begins polling the database for state changes.
// This should be launched as a goroutine.
func (p *Poller) Start(ctx context.Context) {
	log.Printf("[Poller] Starting state poller (interval: %v)", p.interval)

	// Send initial state immediately
	p.poll(ctx)

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("[Poller] Shutting down")
			return
		case <-ticker.C:
			p.poll(ctx)
		}
	}
}

// poll checks for state changes and broadcasts if needed.
func (p *Poller) poll(ctx context.Context) {
	data, version, err := p.getFullState(ctx)
	if err != nil {
		log.Printf("[Poller] Error fetching state: %v", err)
		return
	}

	if version != p.lastVersion {
		p.lastVersion = version
		p.broadcast <- data
		log.Printf("[Poller] Broadcasting state update (version: %d, payload: %d bytes)", version, len(data))
	}
}

// ForceBroadcast sends the current state regardless of version change.
func (p *Poller) ForceBroadcast(ctx context.Context) {
	data, version, err := p.getFullState(ctx)
	if err != nil {
		log.Printf("[Poller] Error in forced broadcast: %v", err)
		return
	}
	p.lastVersion = version
	p.broadcast <- data
	log.Printf("[Poller] Forced broadcast (version: %d)", version)
}
