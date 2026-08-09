# Internal Auth & Collaboration State Workers

This document describes how the Spring Boot backend authenticates internal worker calls, routes documents to the right `collaboration-state-worker` node, and proxies state between the frontend and those workers.

## Internal authentication

### `InternalAuthFilter` (`auth/InternalAuthFilter.java`)

The collaboration state workers authenticate against the backend using a **static token** in the request's auth header. The workers know this token and include it on every request.

This filter is configured to intercept **only** requests to the `internal/` routes.

### `internal/collaborationstateworker`

The main route the collaboration state worker uses for **periodic persistence** and **lock refreshing** during a collaboration session.

It expects an additional `isFinal` parameter. When `isFinal` is `true`, the lock is **not refreshed** and is instead **released** from the document (signalling the end of the session).

## Worker routing

### Multiple workers & load balancing

There can be multiple collaboration state workers. Instead of a dedicated load-balancer in front of them, **Spring Boot performs the load balancing itself**, based on a **hash of the document id**.

The list of workers and their URLs is defined in `application.yaml` under `router.workers`.

> **Future direction:** This design will likely change, because it makes scaling workers up/down impossible without restarting the Spring Boot server. A dedicated load balancer would be the better approach.

### `RouterProperties` (`collaborationstateworkerclient/RouterProperties.java`)

An abstraction / interface over the `router` section of `application.yaml`.

> **Note:** `springbootBearerToken` is not actually needed here but was still included; this probably needs to be corrected.

### `WorkerRoutingService` (`collaborationstateworkerclient/WorkerRoutingService.java`)

Uses `RouterProperties` to return a worker id for a given document id.

> **Important — routing invariant:** all users in the same collaboration session **must connect to the same worker node**. The id-based rule currently routes a given document to the *same* node **always**. The actual requirement is looser: users connecting to the *same document* must be routed to the same node only for the *current* session.

## Worker proxy

### `DocumentWorkerProxyService` (`collaborationstateworkerclient/DocumentWorkerProxyService.java`)

The component that interacts with the collaboration state workers. The frontend does **not** talk to a worker directly — it always goes through Spring Boot, hence the name **proxy**.

```mermaid
flowchart LR
    FE[Frontend] -->|REST / proxy| BE[Spring Boot Proxy]
    BE -->|document id hash routing| W["collaboration-state-worker node"]
```

The service is used in two main scenarios:

1. **Initializing** a new collaboration session for a document.
2. **Joining** an existing collaboration session.

#### `initializeDocument`

1. Before a session is initialized, the state worker needs the document content. Spring Boot first fetches the content from the DB and includes it in the request to the state worker.
2. Once the state worker has been initialized for the document, a **collaboration lock** is placed on the document.
3. The content is then sent back to the frontend so it can be rendered.

#### `syncDocument`

The response received from the state worker contains the **current document content**. Spring Boot simply forwards this to the frontend so the user can sync with the latest data.

### `DocumentWorkerProxyController` (`collaborationstateworkerclient/DocumentWorkerProxyController.java`)

The frontend-facing endpoint that triggers the proxy operations above.

## Modules used

The proxy also relies on:

| Class | File | Role |
| --- | --- | --- |
| `WorkerHttpClient` | `collaborationstateworkerclient/WorkerHttpClient.java` | Low-level HTTP client used to call a worker. |
| `ProxyResponse` | `collaborationstateworkerclient/ProxyResponse.java` | The data structure returned from a worker call. |

## Related docs

- [documents.md](./documents.md) — the locks (incl. collaborative lock) managed during sessions.

