package broker

import (
	"context"
	"fmt"
	"sync"

	"github.com/redis/go-redis/v9"
)

// wrapper around go-redis client to implement the Broker interface using Redis pub/sub
type RedisBroker struct {
	client *redis.Client
}

func NewRedisBroker(client *redis.Client) *RedisBroker {
	return &RedisBroker{client: client}
}

func (b *RedisBroker) Publish(ctx context.Context, channel string, payload []byte) error {
	if err := b.client.Publish(ctx, channel, payload).Err(); err != nil {
		return fmt.Errorf("publish to %s: %w", channel, err)
	}
	return nil
}

func (b *RedisBroker) Subscribe(ctx context.Context, channel string) (Subscription, error) {
	pubsub := b.client.Subscribe(ctx, channel)     // pubsub object from go-redis to manage the subscription
	if _, err := pubsub.Receive(ctx); err != nil { // confirmation
		_ = pubsub.Close()
		return nil, fmt.Errorf("subscribe to %s: %w", channel, err)
	}

	sub := &redisSubscription{
		pubsub:   pubsub,
		messages: make(chan []byte, 256), // subscription's buffered channel to receive messages
		done:     make(chan struct{}),
	}
	go sub.forward() // start forwarding messages from the redis subscription to the subscription's messages channel
	return sub, nil
}

type redisSubscription struct {
	pubsub   *redis.PubSub
	messages chan []byte
	done     chan struct{}
	once     sync.Once
}

func (s *redisSubscription) Messages() <-chan []byte {
	return s.messages
}

func (s *redisSubscription) Close() error {
	s.once.Do(func() {
		close(s.done)
		_ = s.pubsub.Close()
	})
	return nil
}

// forwards messages from a channel provided by go-redis to the subscription's messages channel
func (s *redisSubscription) forward() {
	defer close(s.messages)
	ch := s.pubsub.Channel() // channel provided by go-redis to receive messages from the subscription
	for {
		select {
		case <-s.done:
			return
		case msg, ok := <-ch: // new message from redis subscription
			if !ok {
				return
			}
			payload := []byte(msg.Payload)
			select { // block if the messages channel is full
			case s.messages <- payload:
			case <-s.done:
				return
			}
		}
	}
}

var _ Subscription = (*redisSubscription)(nil)
