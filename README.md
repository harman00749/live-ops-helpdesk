# Live Ops Helpdesk

Live Ops Helpdesk is a real-time collaborative support dashboard for freight operations. It prevents two agents from editing the same support ticket by making the Node.js Socket.IO server the source of truth for exclusive in-memory locks. Every lock and release is broadcast instantly, and abrupt browser disconnects automatically release abandoned locks.

## Business outcome

- Stops last-write-wins overwrites between concurrent agents.
- Shows live ownership on every connected dashboard without page refreshes.
- Rejects a competing lock before an agent can start editing.
- Protects REST updates by verifying the current socket owns the ticket lock.
- Releases ghost locks when an agent closes a tab, loses connectivity, or shuts a laptop.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Socket.IO Client, Lucide icons, responsive CSS |
| Backend | Node.js, Express 5, TypeScript, Socket.IO Server, Zod, Helmet, rate limiting |
| Persistence | MongoDB Atlas and Mongoose |
| Concurrency | Synchronous server-side `Map<string, TicketLock>` keyed by ticket ID |
| Deployment | Vercel client, Render API/WebSocket server, MongoDB Atlas |
| Verification | Vitest lock-manager and validation tests, Postman REST collection |

## Requirements implemented

### 1. Socket.IO integration

The Socket.IO server runs beside Express on one HTTP server. Supported client events:

| Event | Direction | Purpose |
|---|---|---|
| `join_dashboard` | Client → server | Registers the agent and returns the current lock snapshot |
| `lock_ticket` | Client → server | Atomically checks and acquires an exclusive ticket lock |
| `unlock_ticket` | Client → server | Releases a lock only when the requesting socket owns it |
| `lock_state` | Server → all clients | Broadcasts the complete authoritative lock snapshot |
| `ticket_locked` | Server → all clients | Announces a successful acquisition |
| `ticket_unlocked` | Server → all clients | Announces explicit or ghost release |
| `disconnect` | Socket lifecycle | Releases every lock owned by the disconnected socket |

All mutation events use acknowledgements so rejected collisions appear immediately in the requesting UI.

### 2. In-memory lock authority

`TicketLockManager` stores locks in a JavaScript `Map`. Acquisition is a synchronous check-and-set operation inside Node's event loop: the first socket wins; any later socket receives `ALREADY_LOCKED` with the current agent's name. Reacquiring from the owning socket is idempotent.

The ticket data remains durable in MongoDB, but ephemeral edit presence never waits on a database round trip after ticket existence is confirmed.

### 3. Ghost disconnect recovery

The `disconnect` listener calls `releaseAllBySocket(socket.id)`, deletes every abandoned lock, emits a fresh `lock_state`, and announces `ticket_unlocked` with reason `ghost_disconnect`. Other windows update in real time without refreshing.

### 4. REST race-condition enforcement

`PUT /api/tickets/:id` requires `x-socket-id`. The server checks that the supplied socket currently owns the Map lock before MongoDB is updated. Missing ownership receives `423 Locked`, preventing a stale or manually replayed REST request from bypassing the real-time lock.

## Architecture

```text
Agent A React window ─┐
                     ├── WSS / Socket.IO ──> Node + Express ──> Map(ticketId → socket owner)
Agent B React window ─┘                         │
                                               └── REST /api/tickets ──> MongoDB Atlas

lock_ticket → atomic Map check/set → io.emit(lock_state)
disconnect  → releaseAllBySocket  → io.emit(lock_state)
PUT ticket  → verify x-socket-id  → MongoDB write
```

## Project structure

```text
Live Ops Helpdesk/
├── client/src/
│   ├── components/       # Agent entry, dashboard, cards and edit drawer
│   ├── hooks/            # Socket lifecycle and acknowledgement API
│   ├── services/         # REST client
│   └── types/            # Shared client contracts
├── server/src/
│   ├── controllers/      # Validated REST controllers
│   ├── data/             # Deterministic demo tickets
│   ├── middleware/       # Validation, logging and standard errors
│   ├── models/           # Mongoose Ticket schema and indexes
│   ├── realtime/         # Lock manager and Socket.IO event handlers
│   ├── routes/           # Ticket API routes
│   ├── schemas/          # Strict Zod payloads
│   └── scripts/          # Standalone seed command
├── server/tests/         # Concurrency-state and validation tests
├── docs/                 # Postman collection
├── Prompts.md
├── render.yaml
└── vercel.json
```

## Local setup — PowerShell

Prerequisites: Node.js 20–24 and a MongoDB Atlas connection string.

```powershell
cd "C:\Users\parvinder kaur\OneDrive\Desktop\Live Ops Helpdesk"
npm.cmd install
Copy-Item ".\server\.env.example" ".\server\.env"
Copy-Item ".\client\.env.example" ".\client\.env"
```

Edit `server\.env` and replace only the MongoDB placeholder:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/live_ops_helpdesk?retryWrites=true&w=majority
CLIENT_ORIGIN=http://localhost:5173
SEED_DEMO_TICKETS=true
LOG_HTTP_REQUESTS=true
```

Keep `client\.env` as:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Run both applications:

```powershell
npm.cmd run dev
```

Open `http://localhost:5173`. The server automatically inserts 12 demo tickets only when the ticket collection is empty. Manual reset:

```powershell
npm.cmd run seed -- --reset
```

## Dual-window concurrency test

1. Open `http://localhost:5173` in two separate windows.
2. Join Window 1 as `Agent A` and Window 2 as `Agent B`.
3. Click one available ticket in Window 1.
4. Confirm Window 2 immediately displays `Locked by Agent A` without refresh.
5. Click the same ticket in Window 2 and confirm editing is rejected.
6. Release from Window 1 and confirm Window 2 updates immediately.
7. Lock again in Window 1, then close that tab instead of releasing.
8. Confirm Window 2 receives the ghost-disconnect release automatically.

## REST API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | API and MongoDB readiness |
| GET | `/api/tickets` | Search/filter support tickets |
| POST | `/api/tickets` | Create a strictly validated ticket |
| PUT | `/api/tickets/:id` | Update only when `x-socket-id` owns the lock |

All responses use a standard `{ success, data }` or `{ success, error }` JSON envelope.

## Production deployment

### Render backend

Create a Web Service from this repository or use `render.yaml`.

```text
Build: npm install --include=dev && npm run build --workspace server
Start: npm run start --workspace server
Health: /api/health
```

Environment variables:

```env
NODE_ENV=production
MONGODB_URI=<Atlas URI using live_ops_helpdesk>
CLIENT_ORIGIN=https://YOUR-VERCEL-PROJECT.vercel.app
SEED_DEMO_TICKETS=true
LOG_HTTP_REQUESTS=true
```

Keep one Render instance for the required in-memory `Map` architecture. Horizontal scaling requires replacing the process-local Map with a shared lock service such as Redis plus the Socket.IO Redis adapter.

### Vercel frontend

The root `vercel.json` contains the monorepo build settings. Add:

```env
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api
VITE_SOCKET_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

The HTTPS frontend negotiates secure WebSockets (`wss://`) through Socket.IO. Render `CLIENT_ORIGIN` must exactly match the Vercel origin without a trailing slash.

## 3–5 minute client demo

1. Show the live Vercel URL and connected status.
2. Place two browser windows side-by-side as Agent A and Agent B.
3. Acquire in A and show the instant lock icon in B.
4. Attempt the same ticket in B and show the collision rejection.
5. Release in A and show the immediate update in B.
6. Acquire again in A, close A's tab, and show automatic unlock in B.
7. Briefly show Render logs receiving Socket.IO connections and MongoDB ticket persistence without exposing secrets.

AI architectural queries, adopted decisions, and human validation checks are documented in [Prompts.md](Prompts.md).
