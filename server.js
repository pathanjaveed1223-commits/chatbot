const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

async function handleApi(request, response) {
  const endpoint = request.url === "/api/models" ? "/api/tags" : "/api/chat";
  const controller = new AbortController();
  response.on("close", () => {
    if (!response.writableFinished) controller.abort();
  });
  try {
    const upstream = await fetch(`${OLLAMA_URL}${endpoint}`, {
      method: request.method,
      headers: request.method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: request.method === "POST" ? request : undefined,
      duplex: request.method === "POST" ? "half" : undefined,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10 * 60 * 1000)])
    });

    if (!upstream.ok) {
      const details = await upstream.text();
      sendJson(response, upstream.status, {
        error: details || `Ollama returned ${upstream.status}.`
      });
      return;
    }

    response.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no"
    });

    if (!upstream.body) {
      response.end();
      return;
    }

    for await (const chunk of upstream.body) {
      if (response.destroyed) break;
      response.write(chunk);
    }
    response.end();
  } catch (error) {
    if (response.destroyed) return;
    if (response.headersSent) {
      response.destroy(error);
      return;
    }
    const message = error.cause?.code === "ECONNREFUSED"
      ? "Could not connect to Ollama. Start Ollama and try again."
      : `Could not reach Ollama: ${error.message}`;
    sendJson(response, 502, { error: message });
  }
}

const server = http.createServer((request, response) => {
  if (request.url === "/api/models" || request.url === "/api/chat") {
    if (request.method !== (request.url === "/api/chat" ? "POST" : "GET")) {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }
    handleApi(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  const pathname = new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname;
  const requestedPath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, requestedPath);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
    sendJson(response, 403, { error: "Forbidden." });
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      sendJson(response, error.code === "ENOENT" ? 404 : 500, { error: "File not found." });
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else response.end(contents);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Code Instructor is ready at http://${HOST}:${PORT}`);
  console.log(`Using Ollama at ${OLLAMA_URL}`);
});
