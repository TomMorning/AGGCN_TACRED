package store

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type RedisStore struct {
	client *redis.Client
}

func NewRedis(redisURL string) (*RedisStore, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opts)
	return &RedisStore{client: client}, nil
}

func (r *RedisStore) Ping(ctx context.Context) error {
	if err := r.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("redis: %w", err)
	}
	return nil
}

func (r *RedisStore) Close() error {
	return r.client.Close()
}

// IncrQuotaCounter is available for distributed quota metering across instances.
func (r *RedisStore) IncrQuotaCounter(ctx context.Context, userID string) (int64, error) {
	key := "quota:sessions:" + userID
	return r.client.Incr(ctx, key).Result()
}
