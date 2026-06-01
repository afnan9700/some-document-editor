# WebSocket Service

Go WebSocket service for the document editor.

## What it does

- validates one-time tickets from Redis
- upgrades browser connections to WebSocket
- supports typed JSON envelopes
- broadcasts messages to all clients in the same document room
- fans out across multiple pods through Redis Pub/Sub

## Environment

- `LISTEN_ADDR` default `:8081`
- `REDIS_ADDR` default `127.0.0.1:6379`
- `REDIS_PASSWORD` default empty
- `REDIS_DB` default `0`
- `ALLOWED_ORIGINS` default `http://localhost:4200,http://127.0.0.1:4200`
- `TICKET_KEY_PREFIX` default `ws:ticket:`
- `NODE_ID` default hostname
- `WS_READ_LIMIT_BYTES` default `65536`
- `WS_READ_TIMEOUT` default `60s`
- `WS_WRITE_TIMEOUT` default `10s`
- `WS_PONG_WAIT` default `60s`
- `WS_PING_PERIOD` default `45s`
- `WS_WRITE_WAIT` default `10s`
- `WS_SEND_BUFFER` default `64`
- `WS_ROOM_BUFFER` default `1024`
- `LOG_LEVEL` default `info`

## Redis keys

Tickets are consumed from keys like:

`ws:ticket:<ticket>`

The value is the JSON payload written by Spring Boot.

## WebSocket endpoint

`GET /ws?ticket=<one-time-ticket>`

## Message format

Client to server:

```json
{
  "type": "chat.message",
  "payload": { "text": "hello" }
}
```

Server to client:

```json
{
  "type": "chat.message",
  "documentId": 42,
  "messageId": "....",
  "senderId": 7,
  "sentAt": "2026-05-29T12:34:56Z",
  "payload": { "text": "hello" }
}
```

Ack message:

```json
{
  "type": "connection.ack",
  "payload": {
    "documentId": 42,
    "userId": 7,
    "permissionLevel": "EDITOR",
    "message": "connected"
  }
}
```

## Run locally

```bash
go mod tidy
go run ./cmd/ws-server
```

## Docker

Build:

```bash
docker build -t ws-service .
```
