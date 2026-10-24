import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { allowedOrigins, getEnv } from "./config/env.js";
import { demoTickets } from "./data/demo-tickets.js";
import { TicketModel } from "./models/ticket.model.js";
import { registerSocketServer } from "./realtime/socket-server.js";

async function start() {
  const environment = getEnv();
  await connectDatabase(environment.MONGODB_URI);

  if (environment.SEED_DEMO_TICKETS && await TicketModel.countDocuments() === 0) {
    await TicketModel.insertMany(demoTickets);
    await TicketModel.syncIndexes();
  }

  const server = createServer(app);
  const io = new Server(server, {
    cors: { origin: allowedOrigins(), methods: ["GET", "POST", "PUT"], credentials: true },
    transports: ["websocket", "polling"],
  });
  registerSocketServer(io);

  server.listen(environment.PORT, () => {
    process.stdout.write(`Live Ops Helpdesk API listening on port ${environment.PORT}. Socket.IO ready.\n`);
  });

  const shutdown = async () => {
    io.close();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  process.stderr.write(`Live Ops Helpdesk API failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
