// backend/internal/cache/redis.go
// Redis client for pub/sub, caching, and event broadcasting.
package cache

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var client *redis.Client

// Channel names for pub/sub
const (
	StateChangedChannel = "devswarm:state_changed"
	TaskQueueStream     = "devswarm:task_queue"
	AgentEventChannel   = "devswarm:agent_events"
)

// Connect initializes the Redis client from REDIS_URL env var.
func Connect() error {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379/0"
	}

	opts, err := redis.ParseURL(url)
	if err != nil {
		return err
	}

	client = redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return err
	}

	log.Println("[Redis] Connected successfully")
	return nil
}

// Client returns the underlying Redis client for advanced operations.
func Client() *redis.Client {
	return client
}

// Close shuts down the Redis connection.
func Close() error {
	if client != nil {
		return client.Close()
	}
	return nil
}

// Ping checks the Redis connection.
func Ping(ctx context.Context) error {
	if client == nil {
		return nil
	}
	return client.Ping(ctx).Err()
}

// --- Pub/Sub ---

// Publish sends a message to a Redis channel.
func Publish(ctx context.Context, channel string, message interface{}) error {
	if client == nil {
		return nil
	}
	return client.Publish(ctx, channel, message).Err()
}

// PublishStateChanged notifies all subscribers that the office state has changed.
func PublishStateChanged(ctx context.Context) error {
	return Publish(ctx, StateChangedChannel, "state_updated")
}

// Subscribe returns a pubsub subscription for the given channels.
func Subscribe(ctx context.Context, channels ...string) *redis.PubSub {
	return client.Subscribe(ctx, channels...)
}

// --- Caching ---

// Set stores a value in Redis with an expiration.
func Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if client == nil {
		return nil
	}
	return client.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a value from Redis. Returns redis.Nil if key doesn't exist.
func Get(ctx context.Context, key string) (string, error) {
	if client == nil {
		return "", redis.Nil
	}
	return client.Get(ctx, key).Result()
}

// Delete removes a key from Redis.
func Delete(ctx context.Context, keys ...string) error {
	if client == nil {
		return nil
	}
	return client.Del(ctx, keys...).Err()
}

// InvalidateAgentCache removes cached agent data.
func InvalidateAgentCache(ctx context.Context) error {
	return Delete(ctx, "cache:agents", "cache:state")
}

// --- Streams (Task Queue) ---

// EnqueueTask adds a task to the Redis Stream for async processing.
func EnqueueTask(ctx context.Context, taskData map[string]interface{}) (string, error) {
	if client == nil {
		return "", nil
	}
	result, err := client.XAdd(ctx, &redis.XAddArgs{
		Stream: TaskQueueStream,
		Values: taskData,
	}).Result()
	return result, err
}

// CreateConsumerGroup creates a consumer group for the task queue stream.
func CreateConsumerGroup(ctx context.Context, group string) error {
	if client == nil {
		return nil
	}
	err := client.XGroupCreateMkStream(ctx, TaskQueueStream, group, "0").Err()
	if err != nil && err.Error() == "BUSYGROUP Consumer Group name already exists" {
		return nil // Group already exists, not an error
	}
	return err
}
