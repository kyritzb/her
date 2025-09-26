import { WebSocketServer, WebSocket } from "ws";
import http from "http";

// Simple WS server that will proxy visemes to connected clients.
// You can connect this to ElevenLabs Realtime later and broadcast their viseme events.

const PORT = Number(process.env.PORT || 4001);

const httpServer = http.createServer(async (req, res) => {
  // Simple health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // POST /viseme { viseme: string, value?: number }
  if (req.method === "POST" && req.url === "/viseme") {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (typeof body?.viseme === "string") {
        const payload = JSON.stringify({
          type: "viseme",
          viseme: body.viseme,
          value: Number(body.value ?? 1.0),
        });
        broadcast(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    } catch (err) {
      // fallthrough
    }
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  // POST /phoneme { phoneme: string, value?: number }
  if (req.method === "POST" && req.url === "/phoneme") {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (typeof body?.phoneme === "string") {
        const payload = JSON.stringify({
          type: "phoneme",
          phoneme: body.phoneme,
          value: Number(body.value ?? 1.0),
        });
        broadcast(payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
    } catch (err) {
      // fallthrough
    }
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

httpServer.listen(PORT, () => {
  console.log(`[realtime-server] HTTP on http://localhost:${PORT}`);
  console.log(`[realtime-server] WS   on ws://localhost:${PORT}`);
});

wss.on("connection", (ws: WebSocket) => {
  console.log("[realtime-server] client connected");

  ws.on("message", (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      // Expected incoming messages examples:
      // { type: "ping" }
      // { type: "viseme", viseme: "aa", value: 0.7 }
      // { type: "phoneme", phoneme: "A", value: 0.5 }

      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", t: Date.now() }));
        return;
      }

      // Broadcast viseme events to everyone (including sender)
      if (msg.type === "viseme") {
        broadcast(
          JSON.stringify({
            type: "viseme",
            viseme: msg.viseme,
            value: msg.value ?? 1.0,
          })
        );
        return;
      }

      if (msg.type === "phoneme") {
        // Convert phoneme to VRM expression key if you want
        broadcast(
          JSON.stringify({
            type: "phoneme",
            phoneme: msg.phoneme,
            value: msg.value ?? 1.0,
          })
        );
        return;
      }

      // Unknown messages are ignored for now
    } catch (err) {
      console.error("[realtime-server] invalid message", err);
    }
  });

  ws.on("close", () => {
    console.log("[realtime-server] client disconnected");
  });
});

function broadcast(payload: string) {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
