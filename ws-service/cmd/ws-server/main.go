package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/afnan9700/some-document-editor/ws-service/internal/auth"
	"github.com/afnan9700/some-document-editor/ws-service/internal/broker"
	"github.com/afnan9700/some-document-editor/ws-service/internal/config"
	"github.com/afnan9700/some-document-editor/ws-service/internal/hub"
	"github.com/afnan9700/some-document-editor/ws-service/internal/ws"
)

func main() {
	cfg := config.Load()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// initialize redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	defer func() { _ = redisClient.Close() }()
	// verify redis connection before starting the server
	if err := pingRedis(ctx, redisClient); err != nil {
		logger.Error("redis ping failed", "error", err)
		os.Exit(1)
	}

	ticketStore := auth.NewRedisTicketStore(redisClient, cfg.TicketKeyPrefix)
	pubsubBroker := broker.NewRedisBroker(redisClient)

	roomHub := hub.New(cfg.NodeID, pubsubBroker, logger)

	upgrader := ws.NewUpgrader(cfg.AllowedOrigins)
	wsHandler := ws.NewHandler(ws.HandlerDeps{
		Logger:      logger,
		Hub:         roomHub,
		TicketStore: ticketStore,
		Upgrader:    upgrader,
		Config:      cfg,
	})

	mux := http.NewServeMux()

	// route for go server health check
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	// route for go server health check
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if err := pingRedis(r.Context(), redisClient); err != nil {
			http.Error(w, "redis unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ready"))
	})
	// main route for websocket connections
	mux.Handle("/ws", wsHandler)

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           requestLogger(logger, mux),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("ws server starting",
			"listenAddr", cfg.ListenAddr,
			"redisAddr", cfg.RedisAddr,
			"allowedOrigins", cfg.AllowedOrigins,
			"nodeID", cfg.NodeID,
		)
		errCh <- server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		logger.Info("shutdown requested")
		if err := server.Shutdown(shutdownCtx); err != nil {
			logger.Error("server shutdown failed", "error", err)
			os.Exit(1)
		}
		logger.Info("server shutdown complete")

	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
	}
}

func pingRedis(ctx context.Context, client *redis.Client) error {
	pingCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return client.Ping(pingCtx).Err()
}

func requestLogger(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		logger.Info("http request",
			"method", r.Method,
			"path", r.URL.Path,
			"remoteAddr", r.RemoteAddr,
			"duration", time.Since(start).String(),
		)
	})
}
