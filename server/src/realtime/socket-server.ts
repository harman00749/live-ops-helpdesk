import mongoose from "mongoose";
import type { Server, Socket } from "socket.io";
import { TicketModel } from "../models/ticket.model.js";
import { ticketLockManager, type TicketLock } from "./lock-manager.js";

interface JoinPayload { agentName?: string }
interface TicketPayload { ticketId?: string; agentName?: string }
interface SocketAck { ok: boolean; message?: string; code?: string; lock?: TicketLock; locks?: TicketLock[] }
type Acknowledge = (result: SocketAck) => void;

const cleanAgentName = (value: unknown): string => {
  if (typeof value !== "string") return "Support Agent";
  return value.trim().slice(0, 80) || "Support Agent";
};

function broadcastLocks(io: Server): void {
  io.emit("lock_state", ticketLockManager.snapshot());
}

export function registerSocketServer(io: Server): void {
  io.on("connection", (socket: Socket) => {
    socket.on("join_dashboard", (payload: JoinPayload = {}, acknowledge?: Acknowledge) => {
      const agentName = cleanAgentName(payload.agentName);
      socket.data.agentName = agentName;
      socket.join("dashboard");
      const locks = ticketLockManager.snapshot();
      socket.emit("lock_state", locks);
      acknowledge?.({ ok: true, locks });
    });

    socket.on("lock_ticket", async (payload: TicketPayload = {}, acknowledge?: Acknowledge) => {
      try {
        const ticketId = typeof payload.ticketId === "string" ? payload.ticketId : "";
        if (!mongoose.isValidObjectId(ticketId)) {
          acknowledge?.({ ok: false, code: "INVALID_TICKET", message: "A valid ticket ID is required." });
          return;
        }

        const ticketExists = await TicketModel.exists({ _id: ticketId });
        if (!ticketExists) {
          acknowledge?.({ ok: false, code: "TICKET_NOT_FOUND", message: "Ticket was not found." });
          return;
        }

        const agentName = cleanAgentName(payload.agentName ?? socket.data.agentName);
        socket.data.agentName = agentName;
        const result = ticketLockManager.acquire(ticketId, socket.id, agentName);
        acknowledge?.(result);
        if (result.ok) {
          broadcastLocks(io);
          io.emit("ticket_locked", result.lock);
        }
      } catch {
        acknowledge?.({ ok: false, code: "LOCK_SERVICE_ERROR", message: "Ticket lock could not be verified." });
      }
    });

    socket.on("unlock_ticket", (payload: TicketPayload = {}, acknowledge?: Acknowledge) => {
      const ticketId = typeof payload.ticketId === "string" ? payload.ticketId : "";
      const result = ticketLockManager.release(ticketId, socket.id);
      acknowledge?.(result);
      if (result.ok) {
        broadcastLocks(io);
        io.emit("ticket_unlocked", { ticketId, reason: "agent_unlock" });
      }
    });

    socket.on("disconnect", () => {
      const released = ticketLockManager.releaseAllBySocket(socket.id);
      if (released.length === 0) return;
      broadcastLocks(io);
      released.forEach((lock) => {
        io.emit("ticket_unlocked", { ticketId: lock.ticketId, reason: "ghost_disconnect" });
      });
    });
  });
}
