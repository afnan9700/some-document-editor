package protocol

import (
	"encoding/json"
	"time"
)

type MessageType string

const (
	MessageTypeChat       MessageType = "chat.message"
	MessageTypeDocChange  MessageType = "doc.change"
	MessageTypeConnection MessageType = "connection.ack"
	MessageTypeError      MessageType = "error"
)

type Envelope struct {
	Type       MessageType     `json:"type"`
	DocumentID int64           `json:"documentId,omitempty"`
	MessageID  string          `json:"messageId,omitempty"`
	SenderID   int64           `json:"senderId,omitempty"`
	SentAt     time.Time       `json:"sentAt,omitempty"`
	Payload    json.RawMessage `json:"payload,omitempty"`
}

func MustPayload(v any) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}
