// backend/internal/state/poller.go
// State poller watches Redis pub/sub for changes and triggers WebSocket broadcasts.
// Falls back to periodic DB polling as a heartbeat.
package state

import (
	"context"
	"log"
	"time"

	"devswarm-backend/internal/cache"
)

// Poller watches for state changes via Redis pub/sub and triggers
// broadcasts when changes occur. A fallback ticker ensures eventual consistency.
type Poller struct {
	// Broadcast channel to push state updates to
	broadcast chan<- []byte

	// GetFullState fetches the complete state payload from the database
	getFullState func(ctx context.Context) ([]byte, int64, error)

	// Fallback polling interval (heartbeat)
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

// Start begins listening for state changes via Redis pub/sub,
// with a fallback ticker for heartbeat consistency.
// This should be launched as a goroutine.
func (p *Poller) Start(ctx context.Context) {
	log.Printf("[Poller] Starting state poller (heartbeat: %v)", p.interval)

	// Send initial state immediately
	p.poll(ctx)

	// Try to subscribe to Redis pub/sub
	redisSub := cache.Subscribe(ctx, cache.StateChangedChannel, cache.AgentEventChannel)
	if redisSub != nil {
		defer redisSub.Close()
		redisCh := redisSub.Channel()
		log.Printf("[Poller] Subscribed to Redis channels: %s, %s", cache.StateChangedChannel, cache.AgentEventChannel)

		// Heartbeat ticker (fallback, less frequent)
		ticker := time.NewTicker(p.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("[Poller] Shutting down")
				return
			case msg := <-redisCh:
				// Decide whether to poll full state or forward granular event
				if msg.Channel == cache.StateChangedChannel {
					p.poll(ctx)
				} else {
					// Forward the delta event directly to WebSocket hub
					p.broadcast <- []byte(msg.Payload)
					log.Printf("[Poller] Forwarding granular event from %s (%d bytes)", msg.Channel, len(msg.Payload))
				}
			case <-ticker.C:
				// Heartbeat: check for any missed changes
				p.poll(ctx)
			}
		}
	}

	// Fallback: no Redis available, use pure DB polling
	log.Println("[Poller] Redis unavailable, falling back to DB polling")
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
