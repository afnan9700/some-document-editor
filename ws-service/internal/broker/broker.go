package broker

import (
	"context"

	"github.com/afnan9700/some-document-editor/ws-service/internal/protocol"
)

type Subscription interface {
	Messages() <-chan []byte // go channel to receive messages forwarded from the go-redis channel
	Close() error
}

type Broker interface {
	Publish(ctx context.Context, channel string, payload []byte) error
	Subscribe(ctx context.Context, channel string) (Subscription, error)
}

type EnvelopeMessage struct {
	OriginNodeID string            `json:"originNodeId"`
	Envelope     protocol.Envelope `json:"envelope"`
}
