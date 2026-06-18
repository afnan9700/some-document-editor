package config

import (
	"log/slog"
	"net"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	ListenAddr      string
	RedisAddr       string
	RedisHost       string
	RedisPort       string
	RedisPassword   string
	RedisDB         int
	AllowedOrigins  []string
	TicketKeyPrefix string
	NodeID          string

	WebSocketReadLimit    int64
	WebSocketReadTimeout  time.Duration
	WebSocketWriteTimeout time.Duration
	WebSocketPongWait     time.Duration
	WebSocketPingPeriod   time.Duration
	WebSocketWriteWait    time.Duration
	WebSocketSendBuffer   int
	WebSocketRoomBuffer   int

	LogLevel slog.Level
}

func Load() Config {
	cfg := Config{
		ListenAddr:            getEnv("LISTEN_ADDR", ":8081"),
		RedisHost:             getEnv("REDIS_HOST", "localhost"),
		RedisPort:             getEnv("REDIS_PORT", "6379"),
		RedisPassword:         getEnv("REDIS_PASSWORD", ""),
		RedisDB:               getEnvInt("REDIS_DB", 0),
		AllowedOrigins:        splitAndTrim(getEnv("ALLOWED_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200,http://localhost:80,http://localhost")),
		TicketKeyPrefix:       getEnv("TICKET_KEY_PREFIX", "ws:ticket:"),
		NodeID:                getEnv("NODE_ID", hostnameOrFallback("ws-node")),
		WebSocketReadLimit:    getEnvInt64("WS_READ_LIMIT_BYTES", 65536),
		WebSocketReadTimeout:  durationEnv("WS_READ_TIMEOUT", 60*time.Second),
		WebSocketWriteTimeout: durationEnv("WS_WRITE_TIMEOUT", 10*time.Second),
		WebSocketPongWait:     durationEnv("WS_PONG_WAIT", 60*time.Second),
		WebSocketPingPeriod:   durationEnv("WS_PING_PERIOD", 45*time.Second),
		WebSocketWriteWait:    durationEnv("WS_WRITE_WAIT", 10*time.Second),
		WebSocketSendBuffer:   getEnvInt("WS_SEND_BUFFER", 64),
		WebSocketRoomBuffer:   getEnvInt("WS_ROOM_BUFFER", 1024),
		LogLevel:              slog.LevelInfo,
	}

	cfg.RedisAddr = net.JoinHostPort(
		cfg.RedisHost,
		cfg.RedisPort,
	)

	if v := strings.TrimSpace(strings.ToLower(os.Getenv("LOG_LEVEL"))); v != "" {
		switch v {
		case "debug":
			cfg.LogLevel = slog.LevelDebug
		case "info":
			cfg.LogLevel = slog.LevelInfo
		case "warn", "warning":
			cfg.LogLevel = slog.LevelWarn
		case "error":
			cfg.LogLevel = slog.LevelError
		}
	}

	return cfg
}

func splitAndTrim(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func getEnv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			return parsed
		}
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if parsed, err := time.ParseDuration(v); err == nil {
			return parsed
		}
	}
	return fallback
}

func hostnameOrFallback(fallback string) string {
	host, err := os.Hostname()
	if err != nil || strings.TrimSpace(host) == "" {
		return fallback
	}
	return host
}
