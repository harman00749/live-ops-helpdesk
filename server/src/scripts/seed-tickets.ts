import "dotenv/config";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { getEnv } from "../config/env.js";
import { demoTickets } from "../data/demo-tickets.js";
import { TicketModel } from "../models/ticket.model.js";

async function seed() {
  await connectDatabase(getEnv().MONGODB_URI);
  if (process.argv.includes("--reset")) await TicketModel.deleteMany({});
  const existing = await TicketModel.countDocuments();
  if (existing === 0) await TicketModel.insertMany(demoTickets);
  await TicketModel.syncIndexes();
  process.stdout.write(`Live Ops Helpdesk seed complete: ${await TicketModel.countDocuments()} tickets available.\n`);
  await disconnectDatabase();
}

seed().catch((error) => {
  process.stderr.write(`Ticket seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
