# Configuration

The `config` package reads all of the server's settings from **environment
variables**, with sensible defaults. `config.Load()` returns a single `Config`
struct that is passed around and used everywhere.

## Why a config struct?

The server only ever has *one* configuration, so one might wonder why it's a
dedicated struct with typed fields instead of reading `os.Getenv` wherever needed.
The reasons:

- **One place to know all settings.** You can open `config.go` and see every knob
  the server has.
- **Typed, validated parsing.** Strings, ints, durations, lists, and log levels
  are all parsed once, correctly, in one spot.
- **Easy testing.** `Config` can be built by hand in tests instead of messing with
  real environment variables.
- **Consistent defaults.** Every value has a fallback, so a bare `Load()` with no
  env vars still produces a working server.

## What's in the config

The config groups into a few areas.

### Server & Redis connection

| Field          | Env var            | Default                  | Purpose                                  |
|----------------|--------------------|--------------------------|------------------------------------------|
| `ListenAddr`   | `LISTEN_ADDR`      | `:8081`                  | TCP address the HTTP server listens on.  |
| `RedisHost`    | `REDIS_HOST`       | `localhost`              | Redis host.                              |
| `RedisPort`    | `REDIS_PORT`       | `6379`                   | Redis port.                              |
| `RedisAddr`    | *(derived)*        | `host:port`              | Combined address (built from host+port). |
| `RedisPassword`| `REDIS_PASSWORD`   | (empty)                  | Redis auth password.                     |
| `RedisDB`      | `REDIS_DB`         | `0`                      | Redis database index.                    |

### Origins & identity

| Field            | Env var            | Default                                            | Purpose                                 |
|------------------|--------------------|----------------------------------------------------|-----------------------------------------|
| `AllowedOrigins` | `ALLOWED_ORIGINS`  | localhost:4200 / 127.0.0.1:4200 / localhost:80 / localhost | Which browser origins may connect. |
| `TicketKeyPrefix`| `TICKET_KEY_PREFIX`| `ws:ticket:`                                   | Redis key prefix for tickets.           |
| `NodeID`         | `NODE_ID`          | hostname (fallback `ws-node`)                      | Unique ID of this server node.          |

`NodeID` matters: the broker uses it in `EnvelopeMessage.OriginNodeID` so a node
can recognize its own published messages and skip them.

### Websocket tuning

| Field                | Env var            | Default   | Purpose                                                       |
|----------------------|--------------------|-----------|---------------------------------------------------------------|
| `WebSocketReadLimit` | `WS_READ_LIMIT_BYTES` | `65536` | Max incoming message size (prevents abuse).                |
| `WebSocketReadTimeout` | `WS_READ_TIMEOUT` | `60s`     | Read timeout.                                                 |
| `WebSocketWriteTimeout` | `WS_WRITE_TIMEOUT` | `10s`  | Write timeout.                                                |
| `WebSocketPongWait`  | `WS_PONG_WAIT`     | `60s`     | Max time to wait for a pong before dropping the client.       |
| `WebSocketPingPeriod`| `WS_PING_PERIOD`   | `45s`     | How often `WritePump` sends a ping.                           |
| `WebSocketWriteWait` | `WS_WRITE_WAIT`    | `10s`     | Max time a message may sit in the write buffer.               |
| `WebSocketSendBuffer`| `WS_SEND_BUFFER`   | `64`      | Buffer size of each client's `Send` channel.                  |
| `WebSocketRoomBuffer`| `WS_ROOM_BUFFER`   | `1024`    | Buffer size of a room's subscription channel.                 |

These map directly to the values used by the hub, pumps, and broker.

### Logging

`LogLevel` comes from `LOG_LEVEL` (one of `debug`, `info`, `warn`, `error`). It
defaults to `info`.

## The helper functions

`Load()` is built on a small set of helpers that read an env var and fall back to
a default if it's missing or invalid:

| Helper       | Parses to             |
|--------------|-----------------------|
| `getEnv`     | plain string          |
| `getEnvInt`  | `int`                 |
| `getEnvInt64`| `int64`               |
| `durationEnv`| `time.Duration`       |
| `splitAndTrim`| comma-separated list |

Two nice touches:

- **`net.JoinHostPort`** builds the Redis address safely (handles IPv6, etc.)
  rather than string concatenation.
- **`hostnameOrFallback`** uses the machine's hostname for `NodeID`, falling back
  to a constant — this gives each node a unique ID by default without manual
  setup.

## Example

```bash
export LISTEN_ADDR=:8081
export REDIS_HOST=redis-1
export ALLOWED_ORIGINS="https://editor.example.com"
export NODE_ID=ws-node-3
export WS_SEND_BUFFER=128
export LOG_LEVEL=debug
```