
import { createServer } from "node:http";
import { Server } from "socket.io";

const httpServer = createServer();

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

const PORT = 3000;

httpServer.listen(PORT, () => {
  console.log(`Fortnite Manager démarré sur le port ${PORT}`);
});
