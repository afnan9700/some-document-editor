package ws

import (
	"net/http"
	"strings"

	"github.com/gorilla/websocket"
)

// upgrader object config to establish websocket connection
func NewUpgrader(allowedOrigins []string) websocket.Upgrader {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}

	return websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin: func(r *http.Request) bool {
			if len(allowed) == 0 {
				return true
			}
			origin := strings.TrimSpace(r.Header.Get("Origin"))
			_, ok := allowed[origin]
			return ok
		},
		EnableCompression: false,
	}
}
