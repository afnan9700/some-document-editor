package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/afnan9700/some-document-editor/ws-service/internal/broker"
	"github.com/afnan9700/some-document-editor/ws-service/internal/protocol"
)

type Hub struct {
	nodeID string
	broker broker.Broker // same broker for all rooms
	logger *slog.Logger

	mu    sync.RWMutex    // because maps are not thread-safe
	rooms map[int64]*Room // unique documents handled by this hub instance
}

type Room struct {
	clients map[*Client]struct{}
	sub     broker.Subscription // same subscription for all clients in a room
}

func New(nodeID string, br broker.Broker, logger *slog.Logger) *Hub {
	return &Hub{
		nodeID: nodeID,
		broker: br,
		logger: logger,
		rooms:  make(map[int64]*Room),
	}
}

// add a new client to the appropriate room
func (h *Hub) Register(ctx context.Context, client *Client) error {
	h.mu.Lock() // to safely access and modify the rooms map
	room, exists := h.rooms[client.DocumentID]
	if !exists {
		room = &Room{clients: make(map[*Client]struct{})}
		sub, err := h.broker.Subscribe(ctx, h.channel(client.DocumentID))
		if err != nil {
			h.mu.Unlock()
			return err
		}
		room.sub = sub
		h.rooms[client.DocumentID] = room
		go h.consumeRoom(client.DocumentID, sub) // start consuming messages for this room
	}

	room.clients[client] = struct{}{}
	h.mu.Unlock()

	h.logger.Info("client registered",
		"documentId", client.DocumentID,
		"userId", client.UserID,
		"permissionLevel", client.PermissionLevel,
	)

	if err := h.notifyParticipantEvent(ctx, client, protocol.MessageTypeParticipantJoined, "participant joined"); err != nil {
		h.logger.Warn("failed to emit join event", "error", err)
	}

	return nil
}

// client exit from room
func (h *Hub) Unregister(ctx context.Context, client *Client) {
	if !client.MarkUnregistered() {
		return
	}

	h.mu.Lock() // to safely access and modify the rooms map
	room, ok := h.rooms[client.DocumentID]
	if !ok { // client's room not found (should not happen)
		h.mu.Unlock()
		client.Close()
		return
	}

	delete(room.clients, client)
	empty := len(room.clients) == 0
	if empty {
		delete(h.rooms, client.DocumentID)
	}
	h.mu.Unlock()

	if err := h.notifyParticipantEvent(ctx, client, protocol.MessageTypeParticipantLeft, "participant left"); err != nil {
		h.logger.Warn("failed to emit leave event", "error", err)
	}

	client.Close()

	if empty && room.sub != nil {
		_ = room.sub.Close()
		h.logger.Info("room closed", "documentId", client.DocumentID)
	}
}

// broadcast envelope to local clients and broker
func (h *Hub) HandleClientEnvelope(ctx context.Context, client *Client, env protocol.Envelope) error {
	env.DocumentID = client.DocumentID
	env.SenderID = client.UserID
	env.SentAt = time.Now().UTC()
	if env.MessageID == "" {
		env.MessageID = fmt.Sprintf("%d-%d", time.Now().UnixNano(), client.UserID)
	}

	localBytes, err := json.Marshal(env)
	if err != nil {
		return err
	}
	// broadcast raw bytes to clients on the same hub instance
	h.broadcastLocal(client.DocumentID, localBytes)

	wrapper := broker.EnvelopeMessage{
		OriginNodeID: h.nodeID,
		Envelope:     env,
	}
	payload, err := json.Marshal(wrapper)
	if err != nil {
		return err
	}
	// publish unmarshaled message to the broker
	return h.broker.Publish(ctx, h.channel(client.DocumentID), payload)
}

func (h *Hub) notifyParticipantEvent(ctx context.Context, client *Client, typ protocol.MessageType, message string) error {
	env := protocol.Envelope{
		Type:       typ,
		SenderID:   0, // system event, not a user message
		DocumentID: client.DocumentID,
		SentAt:     time.Now().UTC(),
		Payload: protocol.MustPayload(protocol.ParticipantEventPayload{
			DocumentID:      client.DocumentID,
			UserID:          client.UserID,
			PermissionLevel: client.PermissionLevel,
			Message:         message,
		}),
	}

	localBytes, err := json.Marshal(env)
	if err != nil {
		return err
	}

	h.broadcastLocal(client.DocumentID, localBytes)

	wrapper := broker.EnvelopeMessage{
		OriginNodeID: h.nodeID,
		Envelope:     env,
	}
	payload, err := json.Marshal(wrapper)
	if err != nil {
		return err
	}
	return h.broker.Publish(ctx, h.channel(client.DocumentID), payload)
}

// broadcast message from redis subscription to local clients in the hub
func (h *Hub) consumeRoom(documentID int64, sub broker.Subscription) {
	for payload := range sub.Messages() {
		var msg broker.EnvelopeMessage
		if err := json.Unmarshal(payload, &msg); err != nil {
			h.logger.Warn("invalid broker payload", "documentId", documentID, "error", err)
			continue
		}
		if msg.OriginNodeID == h.nodeID {
			continue
		}
		encoded, err := json.Marshal(msg.Envelope)
		if err != nil {
			h.logger.Warn("cannot marshal broker envelope", "documentId", documentID, "error", err)
			continue
		}
		h.broadcastLocal(documentID, encoded)
	}
}

// broadcast message to all clients in the room on this hub instance
func (h *Hub) broadcastLocal(documentID int64, message []byte) {
	h.mu.RLock()
	room, ok := h.rooms[documentID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	clients := make([]*Client, 0, len(room.clients))
	for c := range room.clients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	slow := make([]*Client, 0)
	for _, client := range clients {
		select {
		case client.Send <- message: // fast client buffers are empty, so they receive the message immediately
		default:
			slow = append(slow, client) // slow clients with full buffers
		}
	}

	// drop slow clients
	for _, client := range slow {
		h.logger.Warn("dropping slow client", "documentId", client.DocumentID, "userId", client.UserID)
		client.Close() // close connection
	}
}

func (h *Hub) channel(documentID int64) string {
	return fmt.Sprintf("ws:doc:%d", documentID)
}
