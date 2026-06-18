package hub

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"github.com/afnan9700/some-document-editor/ws-service/internal/protocol"
)

func (c *Client) ReadPump(h *Hub) {
	defer h.Unregister(context.Background(), c)

	c.Conn.SetReadLimit(c.ReadLimit)
	_ = c.Conn.SetReadDeadline(time.Now().Add(c.PongWait))
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(c.PongWait)) // extend read deadline on every pong
	})

	for {
		messageType, message, err := c.Conn.ReadMessage() // blocks goroutine until a message is received or an error occurs
		if err != nil {
			return
		}
		if messageType != websocket.TextMessage && messageType != websocket.BinaryMessage {
			continue
		}

		var incoming protocol.Envelope
		if err := json.Unmarshal(message, &incoming); err != nil {
			c.SendError("invalid_json", "message must be valid JSON")
			continue
		}

		switch incoming.Type {
		case protocol.MessageTypeChat:
			var payload protocol.ChatPayload
			if len(incoming.Payload) == 0 {
				c.SendError("invalid_payload", "chat payload is required")
				continue
			}
			if err := json.Unmarshal(incoming.Payload, &payload); err != nil {
				c.SendError("invalid_payload", "chat payload is malformed")
				continue
			}
			payload.Text = strings.TrimSpace(payload.Text)
			if payload.Text == "" {
				c.SendError("invalid_payload", "chat message cannot be empty")
				continue
			}
			if len(payload.Text) > 2000 { // enforce max length to prevent abuse
				c.SendError("invalid_payload", "chat message is too long")
				continue
			}

			outgoing := protocol.Envelope{
				Type:       protocol.MessageTypeChat,
				DocumentID: c.DocumentID,
				MessageID:  "",
				SenderID:   c.UserID,
				SentAt:     time.Now().UTC(),
				Payload:    protocol.MustPayload(payload),
			}
			if err := h.HandleClientEnvelope(context.Background(), c, outgoing); err != nil {
				c.SendError("publish_failed", "message could not be delivered")
			}

		case protocol.MessageTypeDocChange:
			if err := h.HandleClientEnvelope(context.Background(), c, incoming); err != nil {
				c.SendError("publish_failed", "message could not be delivered")
			}

		default:
			c.SendError("unsupported_type", "message type is not supported")
		}
	}
}

func (c *Client) WritePump(_ *Hub) {
	ticker := time.NewTicker(c.PingPeriod)
	defer ticker.Stop()
	defer c.Close()

	for {
		select {
		case <-c.Done:
			return

		case message := <-c.Send:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(c.WriteWait)); err != nil {
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			if err := c.Conn.SetWriteDeadline(time.Now().Add(c.WriteWait)); err != nil {
				return
			}
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
