package hub

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"github.com/afnan9700/some-document-editor/ws-service/internal/protocol"
)

type Client struct {
	Conn            *websocket.Conn
	Send            chan []byte
	Done            chan struct{}
	UserID          int64
	DocumentID      int64
	PermissionLevel string
	WriteWait       time.Duration
	PongWait        time.Duration
	PingPeriod      time.Duration
	ReadLimit       int64

	closeOnce      sync.Once
	unregisterOnce sync.Once
}

func NewClient(conn *websocket.Conn, userID, documentID int64, permissionLevel string, sendBuffer int, readLimit int64, writeWait, pongWait, pingPeriod time.Duration) *Client {
	if sendBuffer <= 0 {
		sendBuffer = 64
	}
	return &Client{
		Conn:            conn,
		Send:            make(chan []byte, sendBuffer), // buffered channel for messages to be sent to the client
		Done:            make(chan struct{}),           // channel to signal when the client connection is closed
		UserID:          userID,                        // authenticated user ID associated with this client connection
		DocumentID:      documentID,                    // document ID that this client is collaborating on
		PermissionLevel: permissionLevel,               // permission level of the user ("editor", "viewer")
		WriteWait:       writeWait,                     // max time message can stay in the tcp buffer
		PongWait:        pongWait,                      // max time to wait for a pong response before considering the connection dead
		PingPeriod:      pingPeriod,                    // how often to send pings to the client to keep the connection alive
		ReadLimit:       readLimit,                     // max size of incoming messages to prevent abuse
	}
}

func (c *Client) Close() {
	c.closeOnce.Do(func() { // runs only once
		close(c.Done)
		_ = c.Conn.Close()
	})
}

func (c *Client) MarkUnregistered() bool {
	first := false
	c.unregisterOnce.Do(func() { // runs only once
		first = true
	})
	return first
}

// push message payload to the client's send channel, non-blocking
func (c *Client) SendEnvelope(env protocol.Envelope) {
	payload, err := json.Marshal(env)
	if err != nil {
		return
	}
	select {
	case c.Send <- payload:
	default:
	}
}

func (c *Client) SendError(code, message string) {
	env := protocol.Envelope{
		Type: protocol.MessageTypeError,
		Payload: protocol.MustPayload(protocol.ErrorPayload{
			Code:    code,
			Message: message,
		}),
	}
	c.SendEnvelope(env)
}
