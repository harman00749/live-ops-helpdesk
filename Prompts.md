# AI Engineering Log — Live Ops Helpdesk

This log records AI-assisted architectural questions used during Sprint 19. AI output was treated as a draft. Concurrency behavior, failure handling, security configuration, and deployment claims require human verification.

## Atomic in-memory locking

**Architectural query**  
How should a Node.js Socket.IO server grant a ticket lock so two nearly simultaneous agents cannot both succeed?

**Reasoning goal**  
Make the server the only lock authority and keep check-and-set synchronous.

**Adopted decision**  
Use one process-local `Map` keyed by ticket ID. `acquire()` checks the key and inserts the owner in the same synchronous function before any asynchronous work. The first event wins and the next acknowledgement receives `ALREADY_LOCKED`.

**Human validation**  
Run the lock-manager tests and click the same ticket from two windows. Confirm only one edit drawer opens and every client shows the same owner.

## Ghost disconnect recovery

**Architectural query**  
How can abandoned ticket locks be released when an agent closes a tab without emitting `unlock_ticket`?

**Reasoning goal**  
Make cleanup independent of client cooperation.

**Adopted decision**  
In `socket.on("disconnect")`, iterate the Map, remove every entry owned by the disconnected `socket.id`, then broadcast the authoritative snapshot and a `ghost_disconnect` event.

**Human validation**  
Lock in Window A, close A's tab, and observe Window B unlock automatically. Repeat with a network disconnect and reconnection.

## REST write protection

**Architectural query**  
How can the database update endpoint prevent stale clients from bypassing a WebSocket-only lock?

**Reasoning goal**  
Protect the write at the actual persistence boundary.

**Adopted decision**  
Require the Socket.IO client ID in `x-socket-id` on `PUT /api/tickets/:id`. The controller verifies the Map owner before calling Mongoose and returns `423 Locked` for missing or foreign ownership.

**Human validation**  
Send a PUT without the header and with another socket's ID. Confirm both are rejected and MongoDB remains unchanged.

## React Strict Mode and duplicate sockets

**Architectural query**  
How should the React client avoid stale Socket.IO listeners when Strict Mode mounts effects twice in development?

**Reasoning goal**  
Ensure one active socket per mounted dashboard and deterministic cleanup.

**Adopted decision**  
Create the socket inside one effect keyed by agent identity, register named listeners, remove all listeners and disconnect in cleanup, and keep the active socket in a ref used by acknowledgement helpers.

**Human validation**  
Inspect the browser Network/WebSocket panel and server logs in development. Confirm the settled UI has one live connection and one lock event per click.

## Production WSS and CORS

**Architectural query**  
How should a Vercel HTTPS client securely connect to Socket.IO on a Render backend?

**Reasoning goal**  
Avoid mixed content and prevent unrelated browser origins from opening sockets.

**Adopted decision**  
Expose `VITE_SOCKET_URL` as the Render HTTPS origin. Configure identical exact-origin allowlists for Express CORS and Socket.IO CORS. Socket.IO negotiates secure WebSocket transport from the HTTPS page.

**Human validation**  
Use the live dual-window test, confirm the browser connection uses `wss`, and verify an unrelated origin cannot connect.

## Process-local state limitation

**Architectural query**  
What deployment constraint follows from the assignment's in-memory Map requirement?

**Reasoning goal**  
Prevent different server instances from holding conflicting lock maps.

**Adopted decision**  
Use one Render instance for this delivery. Document that horizontal scaling requires Redis-backed locks and the Socket.IO Redis adapter.

**Human validation**  
Confirm the deployed service runs one instance during evaluation and restart it to verify no durable ticket data is lost even though ephemeral locks reset.
