// backend/internal/hub/hub.go
// WebSocket Hub manages client connections and broadcasts state updates.
package hub

import (
	"log"
	"sync"
)

// Hub maintains the set of active WebSocket clients and broadcasts
// messages to all of them.
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages to broadcast to all clients
	Broadcast chan []byte

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	mu sync.RWMutex
}

// New creates a new Hub instance.
func New() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main event loop. This should be launched as a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			count := len(h.clients)
			h.mu.Unlock()
			log.Printf("[Hub] Client connected. Total clients: %d", count)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			count := len(h.clients)
			h.mu.Unlock()
			log.Printf("[Hub] Client disconnected. Total clients: %d", count)

		case message := <-h.Broadcast:
			h.mu.RLock()
			// Collect dead clients under read lock
			var dead []*Client
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					dead = append(dead, client)
				}
			}
			h.mu.RUnlock()

			// Clean up dead clients under write lock
			if len(dead) > 0 {
				h.mu.Lock()
				for _, client := range dead {
					if _, ok := h.clients[client]; ok {
						delete(h.clients, client)
						close(client.send)
					}
				}
				h.mu.Unlock()
				log.Printf("[Hub] Dropped %d unresponsive clients", len(dead))
			}
		}
	}
}

// Register adds a client to the hub.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
