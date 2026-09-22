# WebSockets and the DevTinder Chat — From Basics to Advanced

This guide explains how real-time communication works on the web, how Socket.IO builds on top of WebSockets, and what every piece of the DevTinder chat code does.

It is written in four parts. Read them in order if you are new to WebSockets, or jump to Part 3 if you only want to understand the DevTinder code.

- **Part 1 — WebSocket basics:** why HTTP is not enough, and how a WebSocket connection works on the wire.
- **Part 2 — Socket.IO:** what the library adds on top of WebSockets (events, rooms, acknowledgements, reconnection).
- **Part 3 — The DevTinder chat, file by file:** every backend and frontend file, explained block by block.
- **Part 4 — Advanced topics:** reconnection, duplicates, race conditions, production deployment, scaling, and debugging.

---

## Table of contents

- [Part 1 — WebSocket basics](#part-1--websocket-basics)
  - [1. The problem: HTTP only answers, it never calls you](#1-the-problem-http-only-answers-it-never-calls-you)
  - [2. The ways to get "real-time" on the web](#2-the-ways-to-get-real-time-on-the-web)
  - [3. What a WebSocket is](#3-what-a-websocket-is)
  - [4. The handshake: how HTTP turns into a WebSocket](#4-the-handshake-how-http-turns-into-a-websocket)
  - [5. Frames: what travels over the connection](#5-frames-what-travels-over-the-connection)
  - [6. A raw WebSocket example (no library)](#6-a-raw-websocket-example-no-library)
- [Part 2 — Socket.IO](#part-2--socketio)
  - [7. Why DevTinder uses Socket.IO instead of raw WebSockets](#7-why-devtinder-uses-socketio-instead-of-raw-websockets)
  - [8. How a Socket.IO connection is set up](#8-how-a-socketio-connection-is-set-up)
  - [9. Core API: emit and on](#9-core-api-emit-and-on)
  - [10. Who receives an emit: the targeting table](#10-who-receives-an-emit-the-targeting-table)
  - [11. Rooms](#11-rooms)
  - [12. Acknowledgements (request/response over a socket)](#12-acknowledgements-requestresponse-over-a-socket)
  - [13. Middleware and connect_error](#13-middleware-and-connect_error)
- [Part 3 — The DevTinder chat, file by file](#part-3--the-devtinder-chat-file-by-file)
  - [14. Architecture overview](#14-architecture-overview)
  - [15. File map](#15-file-map)
  - [16. Backend: `app.js`](#16-backend-appjs)
  - [17. Backend: `models/message.js`](#17-backend-modelsmessagejs)
  - [18. Backend: `utils/chat.js`](#18-backend-utilschatjs)
  - [19. Backend: `utils/socket.js`](#19-backend-utilssocketjs)
  - [20. Backend: `routes/chat.js`](#20-backend-routeschatjs)
  - [21. Frontend: `utils/constants.js` and `utils/socket.js`](#21-frontend-utilsconstantsjs-and-utilssocketjs)
  - [22. Frontend: `components/Chat.jsx`](#22-frontend-componentschatjsx)
  - [23. The life of one message, end to end](#23-the-life-of-one-message-end-to-end)
  - [24. Event and API reference](#24-event-and-api-reference)
  - [25. The security model](#25-the-security-model)
- [Part 4 — Advanced topics](#part-4--advanced-topics)
  - [26. Reconnection and why the client rejoins the room](#26-reconnection-and-why-the-client-rejoins-the-room)
  - [27. Duplicates and race conditions](#27-duplicates-and-race-conditions)
  - [28. Timeouts and the "error, but it was saved" edge case](#28-timeouts-and-the-error-but-it-was-saved-edge-case)
  - [29. React StrictMode connects twice in development](#29-react-strictmode-connects-twice-in-development)
  - [30. Production deployment behind nginx](#30-production-deployment-behind-nginx)
  - [31. Scaling to more than one server](#31-scaling-to-more-than-one-server)
  - [32. Ideas for next features, and how to build them](#32-ideas-for-next-features-and-how-to-build-them)
  - [33. Debugging](#33-debugging)
  - [34. Testing the socket server without a browser](#34-testing-the-socket-server-without-a-browser)
- [Glossary](#glossary)

---

# Part 1 — WebSocket basics

## 1. The problem: HTTP only answers, it never calls you

Normal HTTP works like this:

```
Browser                          Server
   | ---- GET /feed ------------>  |
   | <--- 200 OK (the feed) -----  |
   |        (connection idle / closed)
```

The **client always starts** the conversation. The server can only answer a request; it can never send something on its own.

That is fine for loading a feed or a profile. It does not work for chat. When Bob sends Alice a message, the server has the message, but Alice's browser has not asked for anything. With plain HTTP the server has no way to say "hey Alice, a new message just arrived".

## 2. The ways to get "real-time" on the web

| Technique | How it works | Downsides |
|---|---|---|
| **Short polling** | Client asks `GET /messages` every few seconds. | Wasteful (most answers are "nothing new"), and messages arrive late by up to one interval. |
| **Long polling** | Client asks, and the server *holds the request open* until there is something to say (or a timeout). Then the client immediately asks again. | Works everywhere, but every message costs a full HTTP request with headers. |
| **Server-Sent Events (SSE)** | One long HTTP response that the server keeps writing to. | One direction only: server → client. The client still needs normal HTTP requests to send. |
| **WebSocket** | One long-lived connection where **both sides can send at any time**. | Needs a server and proxies that support it (almost all do today). |

Chat needs both directions, often and fast, so WebSocket is the natural fit.

## 3. What a WebSocket is

A WebSocket is **one TCP connection that stays open**, over which both the browser and the server can send messages whenever they want. This is called **full duplex**.

```
Browser                                  Server
   | ==== one open connection ============ |
   | ---- "hi bob" ----------------------> |
   | <--- "new message from bob" --------- |
   | <--- "bob is typing" ---------------- |
   | ---- "hey!" ------------------------> |
```

Key properties:

- **Persistent:** it is opened once and reused for every message.
- **Low overhead:** after the connection is open, each message carries only a 2–14 byte header, not hundreds of bytes of HTTP headers.
- **Server push:** the server can send data the moment it has it.
- **URLs:** `ws://` for plain connections and `wss://` for encrypted connections (like `http://` and `https://`). They use the same ports as HTTP: 80 and 443.

## 4. The handshake: how HTTP turns into a WebSocket

A WebSocket connection **starts life as a normal HTTP request**. That is why it works through the same ports and the same servers as your API.

**Step 1 — the browser asks to upgrade:**

```http
GET /chat HTTP/1.1
Host: localhost:3000
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: http://localhost:5173
Cookie: token=eyJhbGciOi...
```

- `Upgrade: websocket` and `Connection: Upgrade` say "please switch protocols".
- `Sec-WebSocket-Key` is a random value. It proves the server really understands WebSockets (see the next step).
- The browser attaches cookies for that host automatically. **This is how DevTinder knows who is connecting** (see [section 19](#19-backend-utilssocketjs)).

**Step 2 — the server agrees:**

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

- `101 Switching Protocols` means "from now on, this connection is no longer HTTP".
- `Sec-WebSocket-Accept` is `base64(SHA1(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`. The browser checks it. The long string is a fixed constant from the WebSocket standard (RFC 6455).

**Step 3 — the same TCP connection now carries WebSocket frames** in both directions until one side closes it.

## 5. Frames: what travels over the connection

After the handshake, data is sent in **frames**. Every frame has a small header:

```
 0                   1
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5
+-+-+-+-+-------+-+-------------+
|F|R|R|R| opcode|M| payload len |  ... extended length, masking key, payload ...
|I|S|S|S|  (4)  |A|     (7)     |
|N|V|V|V|       |S|             |
+-+-+-+-+-------+-+-------------+
```

| Field | Meaning |
|---|---|
| `FIN` | 1 = this is the last piece of the message (big messages can be split into several frames). |
| `opcode` | What kind of frame: `0x1` text, `0x2` binary, `0x8` close, `0x9` ping, `0xA` pong. |
| `MASK` | Frames from the browser to the server **must** be masked (XOR-scrambled with a 4-byte key). This protects old proxies from cache-poisoning attacks. Server-to-browser frames are not masked. |
| `payload len` | The size of the data (7 bits, or 16/64 extra bits for bigger messages). |

**Ping/pong** frames are heartbeats. They let each side notice when the other side has disappeared, for example when Wi-Fi drops without closing the connection properly.

**Close** frames end the connection politely, with a status code such as `1000` (normal) or `1001` (going away).

You never write frames by hand. The browser and the server library do it. But knowing they exist helps when you read the DevTools "Messages" tab (see [section 33](#33-debugging)).

## 6. A raw WebSocket example (no library)

This is **not** what DevTinder uses. It shows the bare API so you can see what Socket.IO adds later.

**Browser:**

```js
const ws = new WebSocket("ws://localhost:3000")

ws.onopen = () => ws.send("hello server")          // connection is ready
ws.onmessage = (event) => console.log(event.data)  // server sent something
ws.onclose = () => console.log("closed")           // connection ended
```

**Node server (using the `ws` package):**

```js
const { WebSocketServer } = require("ws")
const wss = new WebSocketServer({ port: 3000 })

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    // Send it to every connected client
    wss.clients.forEach((client) => client.send(data.toString()))
  })
})
```

What is **missing** here, and what you would have to build yourself:

- Messages are just strings. There is no "event name", so you would invent your own format, such as `{"type":"sendMessage", ...}`.
- There is no reconnect. If the connection drops, it stays dropped.
- There is no concept of "rooms" (send only to Alice and Bob).
- There is no way to get a reply to a specific message ("did my message save?").
- There is no authentication step.

Socket.IO gives you all of these.

---

# Part 2 — Socket.IO

## 7. Why DevTinder uses Socket.IO instead of raw WebSockets

Socket.IO is a library with a **server part** (`socket.io`, used in `devtinder_backend`) and a **client part** (`socket.io-client`, used in `devtinder_frontend`). Both are version 4.8.

| Feature | Raw WebSocket | Socket.IO |
|---|---|---|
| Named events (`socket.emit("sendMessage", data)`) | No, only raw strings | Yes |
| Sends JSON objects directly | No, you `JSON.stringify` yourself | Yes |
| Automatic reconnect with back-off | No | Yes |
| Buffers messages while disconnected | No | Yes |
| Rooms (send to a group) | No | Yes |
| Acknowledgements (reply to a specific emit) | No | Yes |
| Middleware (for example, authentication) | No | Yes |
| Falls back to HTTP long polling if WebSockets are blocked | No | Yes |
| Heartbeat to detect dead connections | Manual | Built in |

> **Important:** Socket.IO uses its own protocol on top of WebSocket. A plain `new WebSocket(...)` client **cannot** talk to a Socket.IO server, and a Socket.IO client cannot talk to a plain WebSocket server. Both sides must use Socket.IO.

Socket.IO is built in two layers:

```
+------------------------------------------+
|  Socket.IO   events, rooms, acks,        |   <- what you use in code
|              namespaces, middleware      |
+------------------------------------------+
|  Engine.IO   the connection itself:      |   <- handled for you
|              polling / WebSocket,        |
|              upgrade, heartbeat          |
+------------------------------------------+
|  HTTP / WebSocket / TCP                  |
+------------------------------------------+
```

## 8. How a Socket.IO connection is set up

When the frontend calls `io("http://localhost:3000", { withCredentials: true })`, this happens:

**1. The Engine.IO handshake, over normal HTTP (long polling):**

```
GET http://localhost:3000/socket.io/?EIO=4&transport=polling
Cookie: token=...
```

The server answers with an "open" packet:

```
0{"sid":"Lbo5JLzTotvW3g2LAAAA","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000,"maxPayload":1000000}
```

- `0` = packet type "open".
- `sid` = the session id for this connection.
- `upgrades` = "you may switch to WebSocket".
- `pingInterval` / `pingTimeout` = the heartbeat settings. The server sends a ping every 25 s. If no pong comes back within 20 s, the connection is treated as dead.

**2. Connecting to the namespace.** The client sends `40` ("message" + "CONNECT"). This is where the server's **middleware runs** (DevTinder's login check). If it passes, the server replies `40{"sid":"..."}`. If it fails, the server replies `44{"message":"Please login first"}` (CONNECT_ERROR).

**3. The upgrade.** The client opens a real WebSocket to `/socket.io/?EIO=4&transport=websocket&sid=...`, checks it with `2probe` → `3probe`, then sends `5` ("upgrade"). From now on everything goes over the WebSocket.

**Why start with polling?** Some networks, corporate proxies or antivirus tools block WebSockets. Starting with plain HTTP means the connection always works, and it gets faster once the upgrade succeeds.

**Reading packets.** When you open DevTools and look at the frames, you will see strings like this:

| Frame | Meaning |
|---|---|
| `2` / `3` | Engine.IO ping / pong (heartbeat) |
| `40` | Socket.IO CONNECT (join the default namespace `/`) |
| `42["messageReceived",{...}]` | An **event**: `4` = message, `2` = EVENT, then `[eventName, data]` |
| `421["sendMessage",{...}]` | An event that **expects an acknowledgement**; `1` is the ack id |
| `431[{...}]` | The **acknowledgement** for ack id `1`: `3` = ACK |
| `44{"message":"..."}` | CONNECT_ERROR (middleware rejected the connection) |

## 9. Core API: emit and on

Everything in Socket.IO is **events**. One side `emit`s an event with a name and data; the other side listens with `on`.

```js
// Client
socket.emit("sendMessage", { targetUserId, text })   // send
socket.on("messageReceived", (message) => { ... })   // receive

// Server
socket.on("sendMessage", (data) => { ... })          // receive
socket.emit("messageReceived", message)              // send (to this one client)
```

Built-in events you will see in DevTinder:

| Where | Event | When it fires |
|---|---|---|
| Server | `io.on("connection", (socket) => ...)` | A client connected **and passed the middleware**. `socket` represents that one client. |
| Server | `socket.on("disconnect", ...)` | That client went away (tab closed, network lost, `socket.disconnect()`). |
| Client | `socket.on("connect", ...)` | Connected. It fires **again after every reconnect**. |
| Client | `socket.on("disconnect", ...)` | The connection was lost. |
| Client | `socket.on("connect_error", (err) => ...)` | The connection failed, or the server's middleware rejected it (`err.message` has the reason). |

On the server, two objects matter:

- **`io`** is the whole server. Use it to reach many clients.
- **`socket`** is one connected client (one browser tab). Each tab gets its own `socket` with its own `socket.id`.

## 10. Who receives an emit: the targeting table

This table is the key to understanding any Socket.IO server:

| Server code | Who receives it |
|---|---|
| `socket.emit(ev, data)` | Only this one client |
| `io.emit(ev, data)` | Every connected client |
| `socket.broadcast.emit(ev, data)` | Every client **except** this one |
| `io.to(room).emit(ev, data)` | Every client in `room`, **including** this one |
| `socket.to(room).emit(ev, data)` | Every client in `room` **except** this one ← DevTinder uses this |

## 11. Rooms

A **room** is a named group of sockets, and it exists only on the server. A socket joins with `socket.join("roomName")`. You then send to everyone in it with `io.to("roomName")` or `socket.to("roomName")`.

- Rooms are created automatically when the first socket joins, and removed when the last one leaves.
- A socket can be in many rooms at once.
- When a socket disconnects, it **leaves all its rooms automatically**. If it reconnects, it is a brand new socket in no rooms (see [section 26](#26-reconnection-and-why-the-client-rejoins-the-room)).
- The client cannot see or list rooms. The client only asks, and the server decides.

In DevTinder, **every one-to-one chat is a room**. The room name is the two user ids sorted and joined with a dash, for example `6ab2...78-6ab2...79`. Sorting means Alice and Bob always compute the same name, no matter who opens the chat first.

## 12. Acknowledgements (request/response over a socket)

Sometimes the sender needs an answer: "was my message saved? What is its id?" Socket.IO lets you pass a **callback as the last argument** of `emit`. The server gets that callback as the last argument of its handler. When the server calls it, the data travels back to the client and your callback runs there.

```js
// Client
socket.emit("sendMessage", { text: "hi" }, (response) => {
  console.log(response)   // { message: {...} } or { error: "..." }
})

// Server
socket.on("sendMessage", async (data, ack) => {
  const saved = await Message.create(...)
  ack({ message: saved })  // runs the client's callback with this data
})
```

**Timeouts.** If the server never answers, the callback would never run. `socket.timeout(ms)` adds a deadline, and the callback then gets an **error as its first argument**:

```js
socket.timeout(5000).emit("sendMessage", data, (err, response) => {
  if (err) { /* no answer within 5 seconds */ }
})
```

## 13. Middleware and connect_error

Server middleware runs **once per connection, before `connection` fires**. It works like Express middleware:

```js
io.use((socket, next) => {
  if (allowed) next()                   // let the client in
  else next(new Error("Please login"))  // reject; the client gets connect_error
})
```

If middleware calls `next(new Error(...))`, the client receives a `connect_error` event whose `err.message` is your text. After this kind of rejection, **the client does not retry automatically** (`socket.active` is `false`). You must call `socket.connect()` again yourself, for example after the user logs in.

There is also `io.engine.use(...)`, which runs a **plain Express-style middleware on the underlying HTTP requests** (the handshake and polling requests). DevTinder uses it to run `cookie-parser`, so the cookies are already parsed when `io.use` runs.

---

# Part 3 — The DevTinder chat, file by file

## 14. Architecture overview

Two kinds of connections work together:

```
                          devtinder_backend (port 3000)
                  +-------------------------------------------+
                  |  http.createServer(app)                   |
  Alice's tab     |                                           |
  (React, :5173)  |   Express app (REST)        Socket.IO     |
 +------------+   |   ------------------        ---------     |
 | Chat.jsx   |---HTTP GET /chat/:id ------>  routes/chat.js  |
 |            |   |   (history, once on load)                 |
 |            |<==WebSocket (live)=========>  utils/socket.js   |
 +------------+   |                              |            |
                  |                    room "aliceId-bobId"   |
 +------------+   |                              |            |
 | Chat.jsx   |<==WebSocket (live)=========>-----+            |
 | Bob's tab  |   |                                           |
 +------------+   |          |                                |
                  +----------|--------------------------------+
                             v
                    MongoDB: users, connectionrequests, messages
```

- **REST (`GET /chat/:targetUserId`)** loads the **past** messages once, when the chat page opens.
- **WebSocket (`joinChat`, `sendMessage`, `messageReceived`)** carries **new** messages live, while the page is open.
- **Both** check that the two users are an accepted connection.
- Messages are **saved in MongoDB** before they are delivered, so they survive refreshes and restarts.

## 15. File map

| File | Role |
|---|---|
| `devtinder_backend/src/app.js` | Creates one HTTP server that serves both Express and Socket.IO on the same port. |
| `devtinder_backend/src/models/message.js` | Mongoose model for a stored chat message. |
| `devtinder_backend/src/utils/chat.js` | Shared helpers: room/conversation id, the "are they connected?" check, message formatting. |
| `devtinder_backend/src/utils/socket.js` | The Socket.IO server: login check, `joinChat`, `sendMessage`. |
| `devtinder_backend/src/routes/chat.js` | REST endpoint for chat history. |
| `devtinder_frontend/src/utils/constants.js` | `BASE_URL` (backend address). |
| `devtinder_frontend/src/utils/socket.js` | Creates the Socket.IO client connection. |
| `devtinder_frontend/src/components/Chat.jsx` | The chat page: loads history, listens for live messages, sends messages. |
| `devtinder_frontend/src/components/Connections.jsx` | The "💬 Chat" button links to `/chat/:id` and passes the user card along. |
| `devtinder_frontend/src/App.jsx` | Route `/chat/:targetUserId` → `<Chat />`. |

## 16. Backend: `app.js`

The chat-related lines:

```js
const http = require("http");
const initializeSocket = require("./utils/socket");
const chatRouter = require("./routes/chat");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
// ...other routers...
app.use("/", chatRouter);

const server = http.createServer(app);
initializeSocket(server);

// later: server.listen(process.env.PORT, ...)
```

| Line | What it does and why |
|---|---|
| `app.use("/", chatRouter)` | Registers the REST route `GET /chat/:targetUserId` (history). |
| `http.createServer(app)` | Express's `app` is only a request handler. Socket.IO needs the **real Node HTTP server** so it can catch `/socket.io/` requests and the WebSocket `upgrade` event. We create that server ourselves and give Express to it. |
| `initializeSocket(server)` | Attaches Socket.IO to the same server. |
| `server.listen(...)` | Note that it is `server.listen`, **not** `app.listen`. `app.listen` would create a second, hidden server that Socket.IO is not attached to, and sockets would never connect. |

Result: **one port (3000)** serves both the REST API and the WebSocket. Requests to `/socket.io/...` go to Socket.IO, and everything else goes to Express.

## 17. Backend: `models/message.js`

```js
const MAX_MESSAGE_LENGTH = 1000

const messageSchema = new mongoose.Schema({
    conversationId: { type: String, required: true },
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxLength: MAX_MESSAGE_LENGTH }
}, { timestamps: true })

messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema)
module.exports.MAX_MESSAGE_LENGTH = MAX_MESSAGE_LENGTH
```

| Part | Purpose |
|---|---|
| `conversationId` | The same sorted `"idA-idB"` string used as the socket room name. Every message between Alice and Bob has the same value, whoever sent it. This makes loading a conversation one simple query. |
| `senderId` / `receiverId` | Who sent it and who it was for. `ref: "User"` allows `.populate()` later if needed. |
| `text` | The message. `trim` removes surrounding spaces; `maxLength` is a last safety net (the socket handler checks the length first so it can return a friendly error). |
| `timestamps: true` | Mongoose adds `createdAt` and `updatedAt` automatically. `createdAt` is the time shown in the chat bubble. |
| `index({ conversationId: 1, createdAt: -1 })` | Makes "latest messages of this conversation" fast, even with millions of messages, because MongoDB can read them straight from the index in order. |
| `MAX_MESSAGE_LENGTH` export | Lets `utils/socket.js` reuse the same limit instead of repeating `1000`. |

**Why a separate `Message` collection instead of an array inside one "chat" document?** A MongoDB document is limited to 16 MB, and an ever-growing array gets slower to update. One document per message has no limit and is easy to page through.

## 18. Backend: `utils/chat.js`

Three small helpers, used by **both** the socket server and the REST route so that they always agree.

### `getConversationId(userId, targetUserId)`

```js
const getConversationId = (userId, targetUserId) =>
  [userId.toString(), targetUserId.toString()].sort().join("-");
```

- `toString()` because ids can arrive as MongoDB `ObjectId`s or as plain strings.
- `.sort()` makes the result the same in both directions: `getConversationId(alice, bob) === getConversationId(bob, alice)`.
- Used as the **socket room name** and as the stored **`conversationId`**.

### `areConnected(userId, targetUserId)`

```js
const areConnected = async (userId, targetUserId) => {
  if (!mongoose.isValidObjectId(targetUserId)) {
    return false;
  }
  const connection = await ConnectionRequest.exists({
    $or: [
      { fromUserId: userId, toUserId: targetUserId, status: "accepted" },
      { fromUserId: targetUserId, toUserId: userId, status: "accepted" },
    ],
  });
  return Boolean(connection);
};
```

- **The rule of the whole feature:** you may chat only with someone whose connection request was **accepted**.
- `isValidObjectId` rejects garbage such as `"abc"` before it reaches MongoDB (which would otherwise throw a cast error).
- `$or` checks both directions, because either user may have sent the original request.
- `exists()` is cheaper than `findOne()`: it returns only `{ _id }` or `null`.
- Chatting with yourself is automatically refused, because no one has an accepted request with themselves.

### `formatMessage(message)`

```js
const formatMessage = (message) => ({
  _id: message._id.toString(),
  senderId: message.senderId.toString(),
  text: message.text,
  createdAt: message.createdAt,
});
```

- Turns a database message into the **plain object the frontend receives**, both over the socket and from the REST route, so the frontend handles one shape everywhere.
- Ids become strings, so the frontend can compare `message.senderId === loggedInUser._id` directly.
- It deliberately leaves out `conversationId`, `receiverId` and `updatedAt`, which the UI does not need.

## 19. Backend: `utils/socket.js`

This is the heart of the real-time part. We go through it block by block.

### 19.1 Creating the Socket.IO server

```js
const socket = require("socket.io")

const initializeSocket = (server) => {
    const io = socket(server, {
        cors: {
            origin: process.env.CORS_ORIGIN,
            methods: ["GET", "POST"],
            credentials: true
        }
    })
```

- `require("socket.io")` returns the Socket.IO **Server factory**. Despite the variable name `socket`, calling `socket(server, options)` is the same as `new Server(server, options)`. It returns `io`, the whole server.
- **`cors`**: in development the page runs on `http://localhost:5173` and the backend on `http://localhost:3000`. These are different origins, so the browser only allows the handshake if the server allows that origin. `CORS_ORIGIN` (from `.env`) must be the frontend's address.
- **`credentials: true`**: lets the browser send the **login cookie** with the handshake. Without it, the server could not tell who is connecting. The frontend must also set `withCredentials: true` (see [section 21](#21-frontend-utilsconstantsjs-and-utilssocketjs)).
- Express's `cors()` in `app.js` does **not** cover Socket.IO requests, which is why CORS is configured again here.

### 19.2 Reading cookies on socket requests

```js
    io.engine.use(cookieParser());
```

- Express's `app.use(cookieParser())` only runs for Express routes. Socket.IO requests never reach Express.
- `io.engine.use()` runs an Express-style middleware on Socket.IO's own HTTP requests. After this, `socket.request.cookies` is an object such as `{ token: "eyJhbGciOi..." }`.

### 19.3 Authentication middleware: who is this socket?

```js
    io.use(async (socket, next) => {
        try {
            const { token } = socket.request.cookies || {};
            if (!token) {
                return next(new Error("Please login first"));
            }
            const { _id } = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(_id).select("firstName lastName");
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.user = user;
            return next();
        } catch (error) {
            return next(new Error("Invalid or expired token"));
        }
    })
```

This runs **once per connection, before `connection` fires**, and mirrors the REST `userAuth` middleware:

1. Read the `token` cookie that `/login` or `/signup` set.
2. `jwt.verify` checks the signature and expiry, and gives back the user id that was signed into it.
3. Load the user to make sure the account still exists.
4. Store it on `socket.user`. Every later handler for this socket can trust `socket.user`.
5. Any failure calls `next(new Error(...))`. The connection is refused and the client gets `connect_error` with that message.

**Why this matters:** the old version accepted `{ loggedUser }` from the client. Anyone could open DevTools and send someone else's id. Now **the server decides who you are from the signed cookie**, and the client only says who it wants to talk to.

### 19.4 A client connected

```js
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
```

- This runs once for every connected tab that passed the middleware. The `socket` here is **that tab's** connection.
- `userId` is taken from the verified user and reused by every handler below.

### 19.5 `joinChat`: enter a conversation room

```js
        socket.on("joinChat", async ({ targetUserId } = {}, ack) => {
            const reply = typeof ack === "function" ? ack : () => {};
            try {
                if (!(await areConnected(userId, targetUserId))) {
                    return reply({ error: "You can only chat with your connections" });
                }
                const roomId = getConversationId(userId, targetUserId);
                socket.join(roomId);
                console.log(`User ${userId} joined room ${roomId}`);
                reply({ ok: true });
            } catch (error) {
                console.error(error);
                reply({ error: "Could not join the chat" });
            }
        })
```

| Part | Purpose |
|---|---|
| `({ targetUserId } = {}, ack)` | The client sends `{ targetUserId }` plus an acknowledgement callback. `= {}` stops a crash if a client sends nothing. |
| `const reply = typeof ack === "function" ? ack : () => {}` | A misbehaving client might emit without a callback. Calling `undefined()` would throw, so we fall back to a do-nothing function. |
| `areConnected(...)` | Only accepted connections may join. Otherwise, anyone could join any room and read other people's messages live. |
| `socket.join(roomId)` | Puts this tab into the conversation's room. From now on it receives everything sent `to(roomId)`. |
| `reply({ ok: true })` / `reply({ error })` | Tells the client whether it worked. The frontend shows "Connected" only after `ok`. |

### 19.6 `sendMessage`: validate, save, deliver

```js
        socket.on("sendMessage", async ({ targetUserId, text } = {}, ack) => {
            const reply = typeof ack === "function" ? ack : () => {};
            try {
                const trimmed = typeof text === "string" ? text.trim() : "";
                if (!trimmed) {
                    return reply({ error: "Message cannot be empty" });
                }
                if (trimmed.length > MAX_MESSAGE_LENGTH) {
                    return reply({ error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters` });
                }
                if (!(await areConnected(userId, targetUserId))) {
                    return reply({ error: "You can only chat with your connections" });
                }

                const roomId = getConversationId(userId, targetUserId);
                const message = formatMessage(await Message.create({
                    conversationId: roomId,
                    senderId: userId,
                    receiverId: targetUserId,
                    text: trimmed
                }));

                socket.to(roomId).emit("messageReceived", message);
                reply({ message });
            } catch (error) {
                console.error(error);
                reply({ error: "Message could not be sent" });
            }
        })
```

Step by step:

1. **Validate the text.** `typeof text === "string"` protects against a client sending a number, an object or nothing. It is then trimmed, and empty or too-long messages are refused with a clear error. **Never trust the client**: the frontend also limits length, but anyone can bypass the frontend.
2. **Check the connection again, on every message.** This is not only done at `joinChat`. If one user removes the other later, the next message is refused even though the socket is still open.
3. **Save first, deliver second.** `Message.create` writes to MongoDB. Only after the save succeeds is the message sent out. The receiver never sees a message that was not stored, and the message has its real `_id` and `createdAt`.
4. **`senderId: userId`** comes from the verified cookie, **not** from the client.
5. **Deliver to the others.** `socket.to(roomId).emit("messageReceived", message)` sends it to **everyone in the room except this tab**: the other user, and also the sender's *other* tabs if they have the chat open twice.
6. **Answer the sender.** `reply({ message })` sends the saved message back to the tab that sent it, through the acknowledgement. The sender's UI adds the bubble when this arrives.

Why use the acknowledgement for the sender instead of `io.to(roomId)` for everyone? With the ack, the sender **always** gets a success or a clear error for *their* message, and it never gets the same message twice. It also avoids a race at page load, when a message could be sent before `joinChat` finished putting the tab into the room.

### 19.7 Disconnect

```js
        socket.on("disconnect", () => {
            console.log(`User ${userId} disconnected`)
        })
```

- Only logs. Socket.IO removes the socket from its rooms automatically.

## 20. Backend: `routes/chat.js`

```js
const HISTORY_LIMIT = 100;

chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
    try {
        const { targetUserId } = req.params;
        const userId = req.user._id;

        if (!(await areConnected(userId, targetUserId))) {
            return res.status(403).json({ message: "You can only chat with your connections" });
        }

        const targetUser = await User.findById(targetUserId).select("firstName lastName photoUrl");
        const latest = await Message.find({ conversationId: getConversationId(userId, targetUserId) })
            .sort({ createdAt: -1 })
            .limit(HISTORY_LIMIT)
            .lean();

        res.status(200).json({ targetUser, messages: latest.reverse().map(formatMessage) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Could not load the chat" });
    }
});
```

| Part | Purpose |
|---|---|
| `userAuth` | The normal REST login check; it sets `req.user` from the cookie. |
| `areConnected` → `403` | The same rule as the socket: no history for non-connections. |
| `targetUser` | The other user's name and photo. `Connections.jsx` passes these via router state, but that state is lost on a page refresh or a direct link, so the page gets them from here instead. |
| `.sort({ createdAt: -1 }).limit(100)` | Take the **newest** 100 messages (this uses the index from section 17). |
| `.lean()` | Returns plain objects instead of full Mongoose documents. It is faster, and we only read them. |
| `latest.reverse()` | We fetched newest-first to get the latest 100; reversing puts them **oldest-first**, which is the order a chat displays. |
| `.map(formatMessage)` | The same shape as the socket's `messageReceived`. |

**Why load history over REST and not the socket?** It is a one-time read and fits request/response perfectly. It also uses the existing `userAuth`, and it can be cached, retried or paginated with normal HTTP tools. The socket is kept for what only a socket can do: push new messages.

## 21. Frontend: `utils/constants.js` and `utils/socket.js`

### `constants.js`

```js
const BASE_URL = location.hostname === 'localhost' ? 'http://localhost:3000' : '/api'
```

- In development, the backend is at `http://localhost:3000`.
- When deployed, the frontend calls `/api/...` on its own domain, and a proxy (nginx) forwards it to the backend.

### `socket.js`

```js
import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

export const createSocketConnection = () => {
   if (location.hostname === "localhost") {
      return io(BASE_URL, { withCredentials: true })
   }
   return io("/", { path: "/api/socket.io", withCredentials: true })
}
```

| Part | Purpose |
|---|---|
| `io(url, options)` | Creates the client and **starts connecting immediately**. It returns the client `socket`. |
| `withCredentials: true` | Sends the login cookie with the handshake, even though `:5173` → `:3000` is cross-origin. The server's `credentials: true` is the matching half. |
| **Localhost branch** | Connect straight to `http://localhost:3000`. |
| **Deployed branch** | Socket.IO treats **a path in the URL as a namespace**. `io("/api")` would try to join a namespace called `/api`, which does not exist, and fails with "Invalid namespace". So we connect to the current site (`"/"`) and put the proxy prefix in `path`. The requests then go to `/api/socket.io/...`, and nginx forwards them to the backend's `/socket.io/...`. |

> The `process.env.BASE_URL` error you saw before happened because `process` exists only in Node. Code running in the browser through Vite has no `process`. Vite's own environment variables are read with `import.meta.env.VITE_...`.

## 22. Frontend: `components/Chat.jsx`

### 22.1 Helpers outside the component

```js
const mergeMessages = (current, incoming) => {
  const seen = new Set(current.map((message) => message._id))
  return [...current, ...incoming.filter((message) => !seen.has(message._id))]
}
```

- Appends `incoming` messages to `current`, **skipping any `_id` already shown**. It is the safety net against duplicates (see [section 27](#27-duplicates-and-race-conditions)).
- It returns a **new array** instead of pushing into the old one. React only re-renders when state changes to a new value.

```js
const formatSentAt = (createdAt) => { ... }
```

- Shows `10:42 AM` for today's messages, and `Sep 21, 10:42 AM` for older ones.

```js
const Avatar = ({ url, fallback, alt }) => ( ... )
```

- The round profile picture, or the user's initials if there is no photo.
- It is defined **outside** `Chat` on purpose. A component defined inside another component is re-created on every render, so React would throw away and rebuild every avatar (and reload its image) each time a message arrives.

### 22.2 Reading the route and the store

```js
const { targetUserId } = useParams()
const location = useLocation()
const dispatch = useDispatch()
const loggedInUser = useSelector((state) => state.user.user?.data)
```

- `targetUserId` comes from the URL `/chat/:targetUserId`.
- `location.state` may contain the user card that `Connections.jsx` passed when you clicked "💬 Chat".
- `loggedInUser` is you, loaded by `Body.jsx` from `/profile/view`. It is used to decide which bubbles are "mine".
- `dispatch` is used to show toast errors.

### 22.3 State and refs

| State / ref | Meaning |
|---|---|
| `messages` | The list of messages on screen, oldest first. |
| `fetchedTargetUser` | The other user's name and photo from the history request (for refresh or direct visits). |
| `loading` | `true` until the history request finishes, which shows a spinner. |
| `chatError` | A message that blocks the chat (for example, "You can only chat with your connections"). |
| `connected` | `true` once the socket is connected **and** has joined the room. It drives "Connected / Connecting…" and enables Send. |
| `draft` | The text in the input box. |
| `sending` | `true` while waiting for the server's acknowledgement. It stops double sends. |
| `socketRef` | The live socket object. A **ref** (not state) because changing it should not re-render, and `sendMessage` needs the current socket. |
| `bottomRef` | An empty `<div>` at the end of the list, used to scroll to the newest message. |

```js
const targetUser = location.state?.targetUser ?? fetchedTargetUser
```

- Uses the card from Connections if we have it (instant), otherwise the one from the server.

### 22.4 Effect 1 — load the history (REST)

```js
useEffect(() => {
  axios.get(`${BASE_URL}/chat/${targetUserId}`, { withCredentials: true })
    .then((res) => {
      setFetchedTargetUser(res.data.targetUser)
      setMessages((prev) => mergeMessages(res.data.messages || [], prev))
    })
    .catch((error) => {
      setChatError(error.response?.data?.message || 'Could not load this chat. Please try again.')
    })
    .finally(() => setLoading(false))
}, [targetUserId])
```

- Runs when the page opens (and again if `targetUserId` changes).
- `mergeMessages(history, prev)`: the history goes **first**, then any live messages that already arrived over the socket while the request was in flight. Nothing is lost and nothing is doubled.
- On a `403` or any other failure, the server's message is shown instead of the chat.

### 22.5 Effect 2 — the live socket

```js
useEffect(() => {
  const socket = createSocketConnection()
  socketRef.current = socket

  socket.on('connect', () => {
    socket.emit('joinChat', { targetUserId }, (res) => {
      if (res?.error) {
        setChatError(res.error)
        return
      }
      setConnected(true)
    })
  })
  socket.on('disconnect', () => setConnected(false))
  socket.on('connect_error', (error) => {
    console.error('Chat connection error:', error.message)
    setConnected(false)
  })
  socket.on('messageReceived', (message) => {
    setMessages((prev) => mergeMessages(prev, [message]))
  })

  return () => {
    socket.disconnect()
    socketRef.current = null
  }
}, [targetUserId])
```

| Part | Purpose |
|---|---|
| `createSocketConnection()` | Opens the connection as soon as the chat page mounts. |
| `socket.on('connect', ...)` → `joinChat` | Joins the room **inside the connect handler**. That handler also runs after every automatic reconnect, and a reconnected socket is in no rooms, so it must join again (see [section 26](#26-reconnection-and-why-the-client-rejoins-the-room)). |
| `joinChat` callback | `ok` → show "Connected" and enable sending. `error` → show it and block the chat. |
| `disconnect` / `connect_error` | Back to "Connecting…" and Send disabled. Socket.IO keeps retrying on its own for network problems. |
| `messageReceived` | The other user (or your other tab) sent something; add it. `setMessages(prev => ...)` uses the **latest** list, not the one captured when the effect ran. |
| `return () => socket.disconnect()` | **Cleanup.** When you leave the page, the connection is closed. Without it, every visit to a chat would leave another open socket behind, and old ones would keep adding messages. |

### 22.6 Auto-scroll

```js
React.useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

- Every time the list changes, it scrolls to the bottom so the newest message is visible.

### 22.7 Sending

```js
const sendMessage = (e) => {
  e.preventDefault()
  const text = draft.trim()
  const socket = socketRef.current
  if (!text || sending || !socket) return

  setSending(true)
  socket.timeout(5000).emit('sendMessage', { targetUserId, text }, (err, res) => {
    setSending(false)
    if (err || res?.error) {
      dispatch(showToast(res?.error || 'Message could not be sent. Please try again.', 'error'))
      return
    }
    setMessages((prev) => mergeMessages(prev, [res.message]))
    setDraft('')
  })
}
```

| Part | Purpose |
|---|---|
| `e.preventDefault()` | Stops the form from reloading the page (pressing Enter submits the form). |
| Guard `if (!text \|\| sending \|\| !socket)` | No empty messages, no double sends while one is in flight. |
| `socket.timeout(5000).emit(...)` | Sends the message and waits up to 5 s for the server's acknowledgement. |
| `err` | No answer in 5 s (for example, the connection is down). |
| `res.error` | The server refused it (empty, too long, not connected, or a database error). |
| Success | Adds the **saved** message (with its real `_id` and time) and clears the input. |
| On failure | Shows a toast and **keeps the text in the input**, so nothing typed is lost and the user can press Send again. |

### 22.8 Rendering

- **Header:** back button, avatar, name, and "Connected / Connecting…". This is **your** connection's status. It does not show whether the other user is online.
- **Message list**, in priority order: spinner while loading → error text if blocked → "No messages yet. Say hi 👋" if empty → the bubbles.
- **Bubble side:** `message.senderId === loggedInUser?._id` → `chat-end` (right, yours); otherwise `chat-start` (left, theirs).
- **`whitespace-pre-wrap wrap-break-word`:** keeps line breaks and wraps very long words, so one long link cannot stretch the layout.
- **Input:** `maxLength={1000}` matches the server limit. It is disabled if the chat is blocked. Send is disabled when the draft is empty, when not connected, or while sending.

## 23. The life of one message, end to end

Alice and Bob are accepted connections, and both have the chat open.

```
 Alice's tab                     Server                          Bob's tab
 -----------                     ------                          ---------
 open /chat/bobId
 GET /chat/bobId --------------> userAuth, areConnected
                  <------------- { targetUser, messages[] }   (history shown)

 io(...) handshake -------------> io.use: cookie -> JWT -> user
                  <------------- connected (socket.user = Alice)
 emit joinChat {bobId} ---------> areConnected ✓
                                  socket.join("aliceId-bobId")
                  <------------- ack { ok: true }   ("Connected")
                                                    (Bob did the same and is
                                                     also in "aliceId-bobId")

 types "hi bob", presses Send
 emit sendMessage --------------> validate text ✓
   {bobId, "hi bob"}              areConnected ✓
                                  Message.create(...)  -> MongoDB
                                  socket.to(room).emit ---------> messageReceived
                                                                  {_id, senderId: aliceId,
                                                                   text, createdAt}
                                                                  mergeMessages -> bubble
                                                                  on the LEFT
                  <------------- ack { message }
 mergeMessages -> bubble on the
 RIGHT, input cleared
```

If Bob **refreshes** later, the message comes back through `GET /chat/aliceId`, because it was saved in MongoDB before it was delivered.

If Bob **is not on the chat page**, he is not in the room, so he gets nothing live. The message is still saved, and he sees it the next time he opens the chat.

## 24. Event and API reference

### Socket events

| Event | Direction | Payload sent | Reply / payload received |
|---|---|---|---|
| `joinChat` | client → server | `{ targetUserId }` + ack callback | `{ ok: true }` or `{ error }` |
| `sendMessage` | client → server | `{ targetUserId, text }` + ack callback | `{ message }` or `{ error }` |
| `messageReceived` | server → client | `{ _id, senderId, text, createdAt }` | — |
| `connect_error` | server → client (built in) | `Error` with `message` of `"Please login first"`, `"User not found"`, or `"Invalid or expired token"` | — |

### Error messages the server can return

| Text | Cause |
|---|---|
| `You can only chat with your connections` | No accepted connection request between the two users, or an invalid id. |
| `Message cannot be empty` | The text was empty after trimming, or not a string. |
| `Messages can be at most 1000 characters` | Too long. |
| `Could not join the chat` / `Message could not be sent` | Unexpected server or database error (logged on the server). |

### REST

| Method & path | Auth | Response |
|---|---|---|
| `GET /chat/:targetUserId` | Login cookie | `200 { targetUser: { _id, firstName, lastName, photoUrl }, messages: [...] }` (latest 100, oldest first), `403 { message }`, or `500 { message }` |

## 25. The security model

| Threat | Protection |
|---|---|
| Pretending to be another user | The identity comes from the signed JWT cookie in `io.use`. The client never sends its own id. |
| Reading a stranger's chat live | `joinChat` checks `areConnected` before `socket.join`. |
| Messaging a stranger | `sendMessage` checks `areConnected` on **every** message. |
| Reading a stranger's history | `GET /chat/:id` checks `areConnected` and returns `403`. |
| Huge or garbage payloads | Type check, trim, 1000-character limit (plus the schema `maxLength`). Socket.IO also rejects packets over `maxHttpBufferSize` (1 MB by default). |
| Invalid ids crashing queries | `isValidObjectId` in `areConnected`. |
| Script injection in messages | React escapes text in `{message.text}`, so `<script>` shows up as plain text. Never render messages with `dangerouslySetInnerHTML`. |
| Other websites opening sockets as the user | CORS allows only `CORS_ORIGIN` to connect with credentials. |

---

# Part 4 — Advanced topics

## 26. Reconnection and why the client rejoins the room

When the network drops (Wi-Fi switch, laptop sleep, server restart by nodemon), Socket.IO:

1. Fires `disconnect` on the client. The UI shows "Connecting…".
2. Retries automatically with growing delays (about 1 s, 2 s, 4 s… capped at 5 s by default, with some randomness so thousands of clients do not all retry at once).
3. On success, it creates a **new** server-side socket with a new `socket.id`, which is **in no rooms**.
4. Fires `connect` on the client again.

That is why `joinChat` is emitted **inside** `socket.on('connect', ...)` and not once after `createSocketConnection()`. If it were emitted once, after the first reconnect the user would look "Connected" but never receive messages again.

**Messages sent while the user was disconnected** are not replayed by Socket.IO. They are safe in MongoDB, but they will not appear until the page reloads the history. An improvement is to re-fetch the history (or only messages newer than the last one shown) inside the `connect` handler after a *re*connect. Socket.IO 4.6+ also has an optional "connection state recovery" feature for short disconnections.

## 27. Duplicates and race conditions

Real-time code has timing problems that request/response code does not. The chat handles these:

| Situation | What could go wrong | How it is handled |
|---|---|---|
| A message arrives over the socket **while** the history request is still loading | `setMessages(history)` would overwrite it and it would disappear. | History is **merged** with existing messages: `mergeMessages(history, prev)`. |
| That same message is also inside the history response | It would show twice. | `mergeMessages` skips ids already present. |
| The sender would get their own message twice (ack + broadcast) | Double bubble. | The server uses `socket.to(room)`, which excludes the sending tab; the sender uses only the ack. |
| The same user has the chat open in two tabs | Tab 2 would not see what tab 1 sent. | `socket.to(room)` includes the user's other tabs, because they are other sockets in the room. |
| A message is sent right after the page opens, before `joinChat` has finished | If the sender relied on the room broadcast, it would miss its own message. | The sender relies on the **ack**, not the room. Send is also disabled until `joinChat` succeeds. |
| Double-clicking Send | Two copies saved. | The `sending` flag blocks a second send until the ack arrives. |

## 28. Timeouts and the "error, but it was saved" edge case

`socket.timeout(5000)` covers two cases:

- **The socket was disconnected when you pressed Send.** Socket.IO would normally buffer the emit and send it after reconnecting. With a timeout, when the 5 s run out, the callback gets an error **and the packet is removed from the buffer**, so it will not be sent later by surprise. The user sees the error, the text stays in the input, and they can retry.
- **The packet was sent, but the answer was slow** (for example, a very slow database). The server may still save and deliver the message after the client already showed "could not be sent". The receiver sees it, and the sender sees it after a refresh. Retrying in that moment could create a duplicate.

For a stronger guarantee, the client can generate an id per message (for example, `crypto.randomUUID()`), send it with the message, and have the server ignore a second message with the same id (**idempotency**). This is common in production chat systems.

## 29. React StrictMode connects twice in development

`main.jsx` wraps the app in `<StrictMode>`. In **development only**, React mounts each component, immediately unmounts it, and mounts it again, to reveal missing cleanups. So on the chat page you will see:

- two connections opened, one closed straight away;
- on the server, `joined room`, `disconnected`, `joined room`.

This is expected and **proves the cleanup works**. It does not happen in a production build.

## 30. Production deployment behind nginx

When deployed, `BASE_URL` is `/api`, which suggests nginx forwards `/api/` to the backend. WebSockets need **extra headers** on the proxy. Without them, the connection stays on HTTP long polling (slower), or fails:

```nginx
location /api/ {
    proxy_pass http://localhost:3000/;   # trailing slash: /api/socket.io/ -> /socket.io/
    proxy_http_version 1.1;              # WebSocket upgrade needs HTTP/1.1
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

Also check:

- **`CORS_ORIGIN`** in the backend `.env` must be the real frontend origin, for example `https://devtinder.example.com`.
- **HTTPS:** a page served over `https://` must use `wss://`. Socket.IO does this automatically when you connect to `"/"`, because it follows the page's protocol.
- **Cookies:** when the frontend and the API share the same domain (through `/api`), the cookie is sent normally. If they are ever on **different domains**, the cookie needs `SameSite=None; Secure`, or the browser will not send it with the handshake.
- **Timeouts:** nginx closes idle proxied connections after 60 s by default (`proxy_read_timeout`). Socket.IO's heartbeat every 25 s keeps the connection active, so the default is fine.

## 31. Scaling to more than one server

Rooms live **in the memory of one Node process**. If you run two backend instances (for example, with PM2 cluster mode or behind a load balancer):

- Alice may be connected to server A and Bob to server B.
- `socket.to(room).emit(...)` on server A only reaches sockets on server A. **Bob never gets the message.**

The fixes:

1. **An adapter** that shares events between servers, most commonly the Redis adapter (`@socket.io/redis-adapter`). Every server publishes room events to Redis, and every other server delivers them to its own sockets. The code in `utils/socket.js` stays the same; you only add the adapter when creating `io`.
2. **Sticky sessions** in the load balancer. HTTP long polling sends several requests per session, and they must all reach the **same** server (for example, nginx `ip_hash`). If you force WebSocket-only (`transports: ["websocket"]`), stickiness is not needed, but you lose the polling fallback.

For one server (the current setup), none of this is needed.

## 32. Ideas for next features, and how to build them

| Feature | How to build it with what already exists |
|---|---|
| **Notifications when not on the chat page** | In `connection`, also do `socket.join("user:" + userId)`, a personal room for each user. When sending, also emit `newMessageNotification` to `"user:" + targetUserId`. Create the socket once in `Body.jsx` (app-wide) instead of only in `Chat.jsx`, and show a badge or toast. |
| **Online / offline status** | Keep a `Map<userId, socketCount>` on the server. Increase it on `connection` and decrease it on `disconnect`, then emit `presence` `{ userId, online }` to that user's connections. (It must be a count, because one user can have several tabs.) |
| **"Typing…" indicator** | The client emits `typing` (throttled, for example at most once per second) while the input changes. The server does `socket.to(room).emit("typing", { userId })`. The other side shows "typing…" and hides it after about 3 s of silence. Do not save it to the database. |
| **Read receipts** | Add `readAt` to `Message`. When the receiver's window shows new messages, emit `markRead { targetUserId }`. The server updates `readAt` for unread messages in that conversation and emits `messagesRead` to the room. |
| **Load older messages** | Add `?before=<createdAt>` to `GET /chat/:id` and query `createdAt: { $lt: before }` with the same sort and limit. The existing index already supports it. Call it when the user scrolls to the top. |
| **Refresh after reconnect** | In the `connect` handler, if this is not the first connect, re-run the history request and merge (see [section 26](#26-reconnection-and-why-the-client-rejoins-the-room)). |
| **Rate limiting** | Count messages per `socket.user` per time window in `sendMessage`, and reply `{ error: "Slow down" }` above a limit. |

## 33. Debugging

### See the socket traffic in the browser

1. Open DevTools → **Network** → filter by **WS** (or "Socket").
2. Reload the chat page and click the `socket.io/?EIO=4&transport=websocket...` request.
3. Open the **Messages** tab. You will see the frames from [section 8](#8-how-a-socketio-connection-is-set-up): `2`/`3` heartbeats, `42["messageReceived",...]` events, `42x[...]` emits and `43x[...]` acks.

If you only see many `transport=polling` requests and no `websocket` one, the upgrade is being blocked, usually by a proxy that is missing the nginx headers from section 30.

### Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `Uncaught ReferenceError: process is not defined` | `process.env` used in browser code. | Use `BASE_URL` from `constants.js`, or `import.meta.env.VITE_*`. |
| Stuck on "Connecting…"; console shows `connect_error: Please login first` | The cookie was not sent with the handshake. | `withCredentials: true` on the client, `credentials: true` in the server `cors`, and log in again. |
| `connect_error: Invalid or expired token` | The JWT expired (7 days) or `JWT_SECRET` changed. | Log in again. |
| Browser console CORS error on `/socket.io/` | `CORS_ORIGIN` does not match the page's origin exactly (protocol, host **and port**). | Set it, for example `http://localhost:5173`, and restart the backend. |
| `Invalid namespace` | Connected to a URL that has a path, such as `io("/api")`. | Put the path in the `path` option (section 21). |
| Two tabs in one browser both appear as the same user | They share the same login cookie. | Use a second browser or a private window for the second user. |
| "You can only chat with your connections" | The request is not `accepted`, or the URL has a wrong id. | Accept the request on the Requests page. |
| Messages only appear after a refresh | The socket is not connected, or it did not rejoin the room after a reconnect. | Check the WS tab; check the server log shows `joined room`. |
| Works locally, not deployed | nginx has no WebSocket headers, or `CORS_ORIGIN` is wrong. | Section 30. |

### Server-side logs

`utils/socket.js` logs `User <id> joined room <room>` and `User <id> disconnected`. Errors from handlers are printed with `console.error`. Watch the backend terminal while testing with two browsers.

## 34. Testing the socket server without a browser

`socket.io-client` also runs in Node, so you can script two users. In Node, cookies are not sent automatically; you pass them with `extraHeaders`:

```js
const { io } = require("socket.io-client")
const jwt = require("jsonwebtoken")

const connectAs = (userId) =>
  io("http://localhost:3000", {
    extraHeaders: { cookie: `token=${jwt.sign({ _id: userId }, process.env.JWT_SECRET)}` },
  })

const alice = connectAs(ALICE_ID)
const bob = connectAs(BOB_ID)

bob.on("messageReceived", (m) => console.log("Bob got:", m.text))

alice.on("connect", async () => {
  await alice.emitWithAck("joinChat", { targetUserId: BOB_ID })
  await bob.emitWithAck("joinChat", { targetUserId: ALICE_ID })
  const res = await alice.emitWithAck("sendMessage", { targetUserId: BOB_ID, text: "hi bob" })
  console.log("Alice ack:", res)
})
```

- `emitWithAck` is the promise version of emit-with-callback.
- Use two user ids that have an **accepted** connection request, otherwise you will get "You can only chat with your connections".
- This writes real messages to the database the backend is connected to, so point it at a test database, not production data.

The chat was checked this way (with the database calls replaced by in-memory fakes). These cases were covered: login required, both users can join, live delivery both ways, no duplicate for the sender, the empty and too-long limits, and a non-connected user blocked from joining and sending.

---

## Glossary

| Term | Meaning |
|---|---|
| **Full duplex** | Both sides can send at the same time, independently. |
| **Handshake** | The first HTTP request/response that upgrades the connection to WebSocket (and, in Socket.IO, runs the middleware). |
| **Frame** | One unit of data on a WebSocket connection. |
| **Heartbeat (ping/pong)** | Small periodic messages that prove the connection is still alive. |
| **Long polling** | HTTP requests that the server holds open until there is data. Socket.IO's fallback transport. |
| **Engine.IO** | The lower layer of Socket.IO that manages the connection (polling, WebSocket, upgrade, heartbeat). |
| **Namespace** | A separate channel on one Socket.IO server (`/` by default). DevTinder uses only the default one. |
| **Room** | A server-side group of sockets you can send to together. DevTinder uses one room per conversation. |
| **Emit** | Send a named event with data. |
| **Acknowledgement (ack)** | A callback that lets the receiver answer one specific emit. |
| **Middleware (`io.use`)** | A function that runs before a connection is accepted. DevTinder uses it for login. |
| **Adapter** | The component that decides how room broadcasts reach sockets. In memory by default; Redis for many servers. |
| **Sticky session** | A load balancer rule that sends all requests from one client to the same server. |
| **Idempotency** | Making a repeated request safe: sending the same message twice stores it only once. |
