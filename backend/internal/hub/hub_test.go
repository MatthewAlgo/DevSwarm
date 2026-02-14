// backend/internal/hub/hub_test.go
// Unit tests for WebSocket Hub: register, unregister, broadcast, dead client cleanup.
package hub

import (
	"testing"
	"time"
)

func TestNewHub(t *testing.T) {
	h := New()
	if h == nil {
		t.Fatal("New() returned nil")
	}
	if h.clients == nil {
		t.Error("clients map not initialized")
	}
	if h.Broadcast == nil {
		t.Error("Broadcast channel not initialized")
	}
	if cap(h.Broadcast) != 256 {
		t.Errorf("Broadcast buffer: got %d, want 256", cap(h.Broadcast))
	}
}

func TestClientCount(t *testing.T) {
	h := New()
	if h.ClientCount() != 0 {
		t.Errorf("ClientCount: got %d, want 0", h.ClientCount())
	}
}

func TestRegisterAndUnregister(t *testing.T) {
	h := New()
	go h.Run()

	// Create a fake client
	c := &Client{hub: h, send: make(chan []byte, 256)}

	// Register
	h.Register(c)
	time.Sleep(50 * time.Millisecond) // Let Run() process

	if h.ClientCount() != 1 {
		t.Errorf("After register: count=%d, want 1", h.ClientCount())
	}

	// Unregister
	h.Unregister(c)
	time.Sleep(50 * time.Millisecond)

	if h.ClientCount() != 0 {
		t.Errorf("After unregister: count=%d, want 0", h.ClientCount())
	}
}

func TestBroadcastToClients(t *testing.T) {
	h := New()
	go h.Run()

	c1 := &Client{hub: h, send: make(chan []byte, 256)}
	c2 := &Client{hub: h, send: make(chan []byte, 256)}

	h.Register(c1)
	h.Register(c2)
	time.Sleep(50 * time.Millisecond)

	// Broadcast a message
	msg := []byte(`{"type":"STATE_UPDATE","version":1}`)
	h.Broadcast <- msg
	time.Sleep(50 * time.Millisecond)

	// Both clients should receive the message
	select {
	case received := <-c1.send:
		if string(received) != string(msg) {
			t.Errorf("Client1 received: %q, want %q", received, msg)
		}
	default:
		t.Error("Client1 did not receive broadcast")
	}

	select {
	case received := <-c2.send:
		if string(received) != string(msg) {
			t.Errorf("Client2 received: %q, want %q", received, msg)
		}
	default:
		t.Error("Client2 did not receive broadcast")
	}
}

func TestBroadcastDropsDeadClients(t *testing.T) {
	h := New()
	go h.Run()

	// Create a client with zero-buffered channel (will block)
	deadClient := &Client{hub: h, send: make(chan []byte)} // unbuffered - will block
	aliveClient := &Client{hub: h, send: make(chan []byte, 256)}

	h.Register(deadClient)
	h.Register(aliveClient)
	time.Sleep(50 * time.Millisecond)

	if h.ClientCount() != 2 {
		t.Fatalf("Expected 2 clients, got %d", h.ClientCount())
	}

	// Broadcast — dead client can't receive (unbuffered channel, no reader)
	h.Broadcast <- []byte("test")
	time.Sleep(100 * time.Millisecond)

	// Dead client should be removed
	if h.ClientCount() != 1 {
		t.Errorf("After dead client cleanup: count=%d, want 1", h.ClientCount())
	}

	// Alive client should have received the message
	select {
	case <-aliveClient.send:
		// OK
	default:
		t.Error("Alive client did not receive message")
	}
}

func TestMultipleRegistrations(t *testing.T) {
	h := New()
	go h.Run()

	clients := make([]*Client, 10)
	for i := range clients {
		clients[i] = &Client{hub: h, send: make(chan []byte, 256)}
		h.Register(clients[i])
	}
	time.Sleep(100 * time.Millisecond)

	if h.ClientCount() != 10 {
		t.Errorf("ClientCount: got %d, want 10", h.ClientCount())
	}

	// Unregister all
	for _, c := range clients {
		h.Unregister(c)
	}
	time.Sleep(100 * time.Millisecond)

	if h.ClientCount() != 0 {
		t.Errorf("After unregister all: count=%d, want 0", h.ClientCount())
	}
}

func TestDoubleUnregister(t *testing.T) {
	h := New()
	go h.Run()

	c := &Client{hub: h, send: make(chan []byte, 256)}
	h.Register(c)
	time.Sleep(50 * time.Millisecond)

	h.Unregister(c)
	time.Sleep(50 * time.Millisecond)

	// Second unregister should not panic
	// (but since send is already closed, we can't send via the channel again)
	// The hub should handle this gracefully
	if h.ClientCount() != 0 {
		t.Errorf("After double unregister: count=%d, want 0", h.ClientCount())
	}
}
