# Protocol

The `protocol` package defines **how messages are shaped and typed**. Every
message that travels between a client and the server — and between server nodes —
is wrapped in the same `Envelope`. Services agree to use the same format, which is
what keeps everything neat and consistent.

## The `Envelope`

Every message is a small, well-known container. Common fields live on the
envelope; the actual message content lives in `Payload`.

```go
type Envelope struct {
    Type       MessageType     `json:"type"`                // what kind of message this is
    DocumentID int64           `json:"documentId,omitempty"`
    MessageID  string          `json:"messageId,omitempty"`
    SenderID   int64           `json:"senderId,omitempty"`  // who sent it
    SentAt     time.Time       `json:"sentAt,omitempty"`
    Payload    json.RawMessage `json:"payload,omitempty"`   // the actual content
}
```

### Why `json.RawMessage` for the payload?

The payload is deliberately kept as raw JSON bytes rather than a typed field. This
lets **one** envelope carry **many** different kinds of messages. The `Type` field
tells receivers how to interpret the payload. If the payload were typed, we'd need
a different struct for every message kind.

### `omitempty`

Fields marked `omitempty` are only serialized if they have a non-zero value. This
keeps messages small. For example, a system event (like "user joined") has no real
sender, so `SenderID` is left out.

## Message types

The `Type` field uses one of these constants:

| Constant                    | Value                     | Meaning                                        |
|-----------------------------|---------------------------|------------------------------------------------|
| `MessageTypeChat`           | `chat.message`            | A chat text message.                           |
| `MessageTypeDocChange`      | `doc.change`              | A collaborative document change.               |
| `MessageTypeConnection`     | `connection.ack`          | Server confirms a client just connected.       |
| `MessageTypeParticipantJoined` | `room.participant.joined` | Someone joined the room.                     |
| `MessageTypeParticipantLeft`   | `room.participant.left`   | Someone left the room.                       |
| `MessageTypeError`          | `error`                   | An error sent back to a client.                |

## Payloads

Each message type has a matching payload struct. They are simple data holders.

### `ChatPayload`

```go
type ChatPayload struct {
    Text string `json:"content"`
}
```

### `ConnectionAckPayload`

Sent to a client right after it connects, mirroring back who it is and what it
may do:

```go
type ConnectionAckPayload struct {
    DocumentID      int64  `json:"documentId"`
    UserID          int64  `json:"userId"`
    PermissionLevel string `json:"permissionLevel"`
    Message         string `json:"message"`
}
```

### `ParticipantEventPayload`

Used for both "joined" and "left" events:

```go
type ParticipantEventPayload struct {
    DocumentID      int64  `json:"documentId"`
    UserID          int64  `json:"userId"`
    Username        string `json:"username"`
    PermissionLevel string `json:"permissionLevel"`
    Message         string `json:"message"`
}
```

### `ErrorPayload`

```go
type ErrorPayload struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}
```

The `Code` is a machine-readable string (e.g. `invalid_json`, `invalid_payload`,
`unsupported_type`, `publish_failed`) so the client can handle specific errors
instead of parsing human text. `Message` is for humans to read.

## The one helper: `MustPayload`

Most structs you'd normally construct by hand. One exception:

```go
func MustPayload(v any) json.RawMessage {
    b, _ := json.Marshal(v)
    return b
}
```

This marshals any Go struct into the raw JSON bytes the envelope expects, and
silently drops the error (which is why it's "Must" — it *must* succeed). It's used
whenever a payload struct needs to be placed into an `Envelope.Payload`.

## Why this design matters

- One shared message container keeps the wire protocol stable and predictable.
- `Type` + JSON payload lets the format evolve without changing the envelope.
- The same `Envelope` is used by *all* the services, not just the websocket
  server, so every team/service speaks the same language.