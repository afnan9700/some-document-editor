package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrTicketNotFound = errors.New("websocket ticket not found")
	ErrTicketExpired  = errors.New("websocket ticket expired")
	ErrTicketInvalid  = errors.New("websocket ticket invalid")
)

type TicketStore interface {
	Consume(ctx context.Context, ticket string) (*TicketPayload, error)
}

type RedisTicketStore struct {
	client *redis.Client
	prefix string
	now    func() time.Time
}

func NewRedisTicketStore(client *redis.Client, prefix string) *RedisTicketStore {
	if prefix == "" {
		prefix = "ws:ticket:"
	}
	return &RedisTicketStore{
		client: client,
		prefix: prefix,
		now:    time.Now,
	}
}

func (s *RedisTicketStore) Consume(ctx context.Context, ticket string) (*TicketPayload, error) {
	if ticket == "" {
		return nil, ErrTicketInvalid
	}

	key := s.key(ticket)
	raw, err := s.client.GetDel(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, ErrTicketNotFound
		}
		return nil, fmt.Errorf("redis getdel %s: %w", key, err)
	}

	var payload TicketPayload
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrTicketInvalid, err)
	}

	if payload.ExpiresAt.IsZero() || s.now().After(payload.ExpiresAt) {
		return nil, ErrTicketExpired
	}
	if payload.DocumentID <= 0 || payload.UserID <= 0 {
		return nil, ErrTicketInvalid
	}

	return &payload, nil
}

func (s *RedisTicketStore) key(ticket string) string {
	return s.prefix + ticket
}
