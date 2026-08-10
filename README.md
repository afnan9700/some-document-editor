# Document Editor

A collaborative Markdown document editor. One owner per document, shared access via invite links, and real-time live editing through CRDTs (Yjs). Built to be horizontally scalable, so all the state-syncing bits are separated out into services that can each scale on their own.

This project started as a way to learn Spring Boot (and a bunch of other things along the way), so it grew organically. It's mostly an excuse to try out working with a lot of moving parts at once: a Java backend, an Angular frontend, a Go websocket layer, Redis pub/sub, HAProxy, and Docker. 

Most of the code was generated with the help of an LLM, but I've tried to read and understand all of it before it lands in the repo. If you find this project and wonder "why is this built this way," there's a good chance the reasoning (and sometimes the lack of it) is written down somewhere in the docs.

## High level

- **Auth** — JWT access + refresh tokens. Access tokens live in memory, refresh tokens
  in httpOnly cookies. A "silent refresh" interceptor queues requests while it gets a
  new access token so the user never notices expiry.
- **Documents** — one owner per document. Owners can generate invite links, and users
  who use a link land in a pending-requests queue that the owner approves or rejects.
- **Live editing** — the editor is CodeMirror wired up to Yjs. Changes become CRDTs,
  get broadcast over the websocket layer, and room state is sharded across redis pub/sub
  channels so multiple websocket nodes stay in sync.

## Core components

| Part | What it is |
| --- | --- |
| `backend/` | Spring Boot / JPA service. Auth, users, documents, permissions, locks, invites, access requests. Also does the routing for state-worker requests. |
| `frontend/` | Angular app (DaisyUI + Tailwind + CodeMirror + Yjs). |
| `ws-service/` | A Go websocket server. Validates a short-lived ticket handed out by the backend, then relays CRDT messages to redis pub/sub per document. Horizontally scalable. |
| `collaboration-state-worker/` | A "silent participant" that sits in each room. Keeps its own copy of the document so new joiners can sync, and periodically persists state back to Spring Boot. |
| `haproxy/` | TCP load balancing in front of the websocket layer. |
| `redis` | Pub/sub broker between websocket nodes, plus the ticket store. |
| `db` | Postgres. |

## Running it

Compose pulls images for the infra pieces (redis, postgres, haproxy), but the four application services (`backend`, `ws-service`, `collaboration-state-worker`, `frontend`) are built from their local `Dockerfile`s.

1. **Clone the repo**

   ```bash
   git clone git@github.com:afnan9700/some-java-project.git
   cd some-java-project
   ```

2. **Create the environment file** (the compose file expects a `.env`)

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and fill in the blanks — at minimum the RSA `JWT_PRIVATE_KEY` /
   `JWT_PUBLIC_KEY` pair (the file includes an `openssl` command to generate one),
   and you should give every service its own secret.

3. **Compose it up**

   ```bash
   docker compose up --build
   ```

   The frontend lands on `http://localhost:4200`; the backend on `http://localhost:8080`.
   The websocket entrypoint is on `http://localhost:3001` through HAProxy.

## Planned features 

- Kubernetes integration (though this might require a bit of a rewrite because I did not account for node failures)
- UI polish
- OIDC on top of the existing JWT flow
- Custom HTML sandboxing inside documents, with a way to pass data between the editor
  and the sandbox
- Something AI-ish, probably
- Maybe voice chat, or turning rooms into something closer to a social space
- Participant cursors in the editor (skipped during the Yjs integration — `y-codemirror`
  would've given them for free, tbd whether to rip out the custom sync to get them)

## Docs

`docs/` contains notes on each subsystem (`backend-springboot/`, `frontend/`, `ws-service/`). Some parts are still WIP, but I will finish them some day. Probably. Also try checking out `project-log.md` if you think it's something that might interest you.