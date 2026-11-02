import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Server } from "socket.io";
import { registerBattleRoyaleSocket } from "./battleRoyaleSocket";
import { BATTLE_ROYALE_MAP } from "../../shared/src/battle-royale/map";

const clientDirectory = resolve(process.cwd(), "client");
const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const httpServer = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

  // Socket.IO registers its own request handler for this route.
  if (pathname.startsWith("/socket.io/")) return;

  if (pathname === "/api/map") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(BATTLE_ROYALE_MAP));
    return;
  }

  let relativePath: string;
  try {
    relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const filePath = resolve(clientDirectory, relativePath);
  if (filePath !== clientDirectory && !filePath.startsWith(clientDirectory + sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log(`Joueur connecté : ${socket.id}`);

  socket.emit("server:message", {
    message: "Bienvenue sur Fortnite Manager !",
  });

  socket.on("disconnect", () => {
    console.log(`Joueur déconnecté : ${socket.id}`);
  });
});

registerBattleRoyaleSocket(io);

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`Fortnite Manager démarré sur http://localhost:${PORT}`);
});
