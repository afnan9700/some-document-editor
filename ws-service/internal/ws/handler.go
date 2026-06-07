package ws

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"github.com/afnan9700/some-document-editor/ws-service/internal/auth"
	"github.com/afnan9700/some-document-editor/ws-service/internal/config"
	"github.com/afnan9700/some-document-editor/ws-service/internal/hub"
	"github.com/afnan9700/some-document-editor/ws-service/internal/protocol"
)

type HandlerDeps struct {
	Logger      *slog.Logger
	Hub         *hub.Hub
	TicketStore auth.TicketStore
	Upgrader    websocket.Upgrader
	Config      config.Config
}

type Handler struct {
	logger      *slog.Logger
	hub         *hub.Hub
	ticketStore auth.TicketStore
	upgrader    websocket.Upgrader
	cfg         config.Config
}

func NewHandler(deps HandlerDeps) *Handler {
	return &Handler{
		logger:      deps.Logger,
		hub:         deps.Hub,
		ticketStore: deps.TicketStore,
		upgrader:    deps.Upgrader,
		cfg:         deps.Config,
	}
}

// connects to new client
// main method to connect new clients to the hub
// everything else follows from this method
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// ticket expected in url
	ticket := strings.TrimSpace(r.URL.Query().Get("ticket"))
	if ticket == "" {
		http.Error(w, "missing ticket", http.StatusBadRequest)
		return
	}

	// ticket validation
	ticketCtx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	payload, err := h.ticketStore.Consume(ticketCtx, ticket)
	cancel()
	if err != nil {
		status := http.StatusUnauthorized
		if errors.Is(err, auth.ErrTicketExpired) {
			status = http.StatusUnauthorized
		}
		http.Error(w, http.StatusText(status), status)
		h.logger.Warn("ticket rejected", "error", err)
		return
	}

	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Warn("websocket upgrade failed", "error", err)
		return
	}

	client := hub.NewClient(
		conn,
		payload.UserID,
		payload.DocumentID,
		string(payload.PermissionLevel),
		h.cfg.WebSocketSendBuffer,
		h.cfg.WebSocketReadLimit,
		h.cfg.WebSocketWriteWait,
		h.cfg.WebSocketPongWait,
		h.cfg.WebSocketPingPeriod,
	)

	if err := h.hub.Register(r.Context(), client); err != nil {
		h.logger.Error("failed to register client", "error", err)
		client.Close()
		return
	}

	// send initial connection acknowledgment with user and document info to client
	ack := protocol.Envelope{
		Type: protocol.MessageTypeConnection,
		Payload: protocol.MustPayload(protocol.ConnectionAckPayload{
			DocumentID:      payload.DocumentID,
			UserID:          payload.UserID,
			PermissionLevel: string(payload.PermissionLevel),
			Message:         "connected",
		}),
	}
	client.SendEnvelope(ack)

	// start read and write goroutines
	go client.WritePump(h.hub)
	go client.ReadPump(h.hub)
}
