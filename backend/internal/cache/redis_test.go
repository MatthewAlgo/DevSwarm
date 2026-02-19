// backend/internal/cache/redis_test.go
// Unit tests for Redis cache operations.
package cache

import (
	"context"
	"os"
	"testing"
	"time"
)

// skipIfNoRedis skips the test if Redis is not available.
func skipIfNoRedis(t *testing.T) {
	t.Helper()
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379/0"
	}
	os.Setenv("REDIS_URL", url)

	if err := Connect(); err != nil {
		t.Skipf("Redis not available, skipping: %v", err)
	}
}

func TestConnect(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx := context.Background()
	if err := Ping(ctx); err != nil {
		t.Fatalf("Ping failed after connect: %v", err)
	}
}

func TestSetGetDelete(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx := context.Background()

	// Set a value
	err := Set(ctx, "test:key", "hello_devswarm", 10*time.Second)
	if err != nil {
		t.Fatalf("Set failed: %v", err)
	}

	// Get the value
	val, err := Get(ctx, "test:key")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if val != "hello_devswarm" {
		t.Fatalf("Expected 'hello_devswarm', got '%s'", val)
	}

	// Delete the key
	err = Delete(ctx, "test:key")
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Verify deletion
	_, err = Get(ctx, "test:key")
	if err == nil {
		t.Fatal("Expected error after delete, got nil")
	}
}

func TestPublishSubscribe(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Subscribe to a test channel
	sub := Subscribe(ctx, "test:channel")
	defer sub.Close()

	// Wait for subscription to be established
	time.Sleep(100 * time.Millisecond)

	// Publish a message
	err := Publish(ctx, "test:channel", "test_message")
	if err != nil {
		t.Fatalf("Publish failed: %v", err)
	}

	// Receive the message
	msg, err := sub.ReceiveMessage(ctx)
	if err != nil {
		t.Fatalf("ReceiveMessage failed: %v", err)
	}

	if msg.Payload != "test_message" {
		t.Fatalf("Expected 'test_message', got '%s'", msg.Payload)
	}
	if msg.Channel != "test:channel" {
		t.Fatalf("Expected channel 'test:channel', got '%s'", msg.Channel)
	}
}

func TestPublishStateChanged(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Subscribe to the state changed channel
	sub := Subscribe(ctx, StateChangedChannel)
	defer sub.Close()

	time.Sleep(100 * time.Millisecond)

	// Publish state change
	err := PublishStateChanged(ctx)
	if err != nil {
		t.Fatalf("PublishStateChanged failed: %v", err)
	}

	// Verify message received
	msg, err := sub.ReceiveMessage(ctx)
	if err != nil {
		t.Fatalf("ReceiveMessage failed: %v", err)
	}

	if msg.Payload != "state_updated" {
		t.Fatalf("Expected 'state_updated', got '%s'", msg.Payload)
	}
}

func TestEnqueueTask(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx := context.Background()

	// Clean up the test stream
	Client().Del(ctx, TaskQueueStream)

	// Enqueue a task
	id, err := EnqueueTask(ctx, map[string]interface{}{
		"goal":     "test_goal",
		"agent_id": "orchestrator",
	})
	if err != nil {
		t.Fatalf("EnqueueTask failed: %v", err)
	}
	if id == "" {
		t.Fatal("EnqueueTask returned empty ID")
	}

	// Verify the task exists in the stream
	msgs, err := Client().XRange(ctx, TaskQueueStream, "-", "+").Result()
	if err != nil {
		t.Fatalf("XRange failed: %v", err)
	}
	if len(msgs) != 1 {
		t.Fatalf("Expected 1 message in stream, got %d", len(msgs))
	}
	if msgs[0].Values["goal"] != "test_goal" {
		t.Fatalf("Expected goal 'test_goal', got '%v'", msgs[0].Values["goal"])
	}

	// Cleanup
	Client().Del(ctx, TaskQueueStream)
}

func TestCreateConsumerGroup(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx := context.Background()

	// Clean up
	Client().Del(ctx, TaskQueueStream)

	// Create consumer group (should also create the stream)
	err := CreateConsumerGroup(ctx, "test_workers")
	if err != nil {
		t.Fatalf("CreateConsumerGroup failed: %v", err)
	}

	// Creating again should not error (idempotent)
	err = CreateConsumerGroup(ctx, "test_workers")
	if err != nil {
		t.Fatalf("CreateConsumerGroup (idempotent) failed: %v", err)
	}

	// Cleanup
	Client().Del(ctx, TaskQueueStream)
}

func TestInvalidateAgentCache(t *testing.T) {
	skipIfNoRedis(t)
	defer Close()

	ctx := context.Background()

	// Set some cache entries
	Set(ctx, "cache:agents", "cached_agents", 10*time.Second)
	Set(ctx, "cache:state", "cached_state", 10*time.Second)

	// Invalidate
	err := InvalidateAgentCache(ctx)
	if err != nil {
		t.Fatalf("InvalidateAgentCache failed: %v", err)
	}

	// Verify both are gone
	_, err = Get(ctx, "cache:agents")
	if err == nil {
		t.Fatal("Expected cache:agents to be deleted")
	}
	_, err = Get(ctx, "cache:state")
	if err == nil {
		t.Fatal("Expected cache:state to be deleted")
	}
}

func TestNilClientSafety(t *testing.T) {
	// Test that operations are no-ops when client is nil
	oldClient := client
	client = nil
	defer func() { client = oldClient }()

	ctx := context.Background()

	// All should return nil errors (graceful no-ops)
	if err := Ping(ctx); err != nil {
		t.Fatalf("Ping with nil client should return nil, got: %v", err)
	}
	if err := Publish(ctx, "ch", "msg"); err != nil {
		t.Fatalf("Publish with nil client should return nil, got: %v", err)
	}
	if err := Set(ctx, "k", "v", time.Second); err != nil {
		t.Fatalf("Set with nil client should return nil, got: %v", err)
	}
	if err := Delete(ctx, "k"); err != nil {
		t.Fatalf("Delete with nil client should return nil, got: %v", err)
	}
	if err := InvalidateAgentCache(ctx); err != nil {
		t.Fatalf("InvalidateAgentCache with nil client should return nil, got: %v", err)
	}
	id, err := EnqueueTask(ctx, map[string]interface{}{"test": "data"})
	if err != nil || id != "" {
		t.Fatalf("EnqueueTask with nil client should return empty, got id=%s err=%v", id, err)
	}
	if err := CreateConsumerGroup(ctx, "group"); err != nil {
		t.Fatalf("CreateConsumerGroup with nil client should return nil, got: %v", err)
	}
}

func TestConstants(t *testing.T) {
	if StateChangedChannel != "devswarm:state_changed" {
		t.Fatalf("Unexpected StateChangedChannel: %s", StateChangedChannel)
	}
	if TaskQueueStream != "devswarm:task_queue" {
		t.Fatalf("Unexpected TaskQueueStream: %s", TaskQueueStream)
	}
	if AgentEventChannel != "devswarm:agent_events" {
		t.Fatalf("Unexpected AgentEventChannel: %s", AgentEventChannel)
	}
}
