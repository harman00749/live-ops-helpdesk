import type { Request, Response } from "express";
import mongoose from "mongoose";
import { TicketModel, serializeTicket } from "../models/ticket.model.js";
import { ticketLockManager } from "../realtime/lock-manager.js";
import { AppError } from "../utils/app-error.js";
import { sendSuccess } from "../utils/responses.js";

const requireTicketId = (value: string): string => {
  if (!mongoose.isValidObjectId(value)) throw new AppError(400, "INVALID_TICKET_ID", "A valid ticket ID is required.");
  return value;
};

export async function listTickets(request: Request, response: Response) {
  const { search = "", status } = request.query as { search?: string; status?: string };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const tickets = await TicketModel.find(filter).sort({ updatedAt: -1 }).limit(200);
  const counts = await TicketModel.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((entry) => [entry._id, entry.count]));

  return sendSuccess(response, {
    tickets: tickets.map(serializeTicket),
    summary: {
      total: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
      open: byStatus.open ?? 0,
      inProgress: byStatus.in_progress ?? 0,
      waiting: byStatus.waiting ?? 0,
      resolved: byStatus.resolved ?? 0,
    },
  });
}

export async function createTicket(request: Request, response: Response) {
  const ticket = await TicketModel.create(request.body);
  return sendSuccess(response, { ticket: serializeTicket(ticket) }, 201);
}

export async function updateTicket(request: Request, response: Response) {
  const rawTicketId = request.params.id;
  const ticketId = requireTicketId(Array.isArray(rawTicketId) ? (rawTicketId[0] ?? "") : (rawTicketId ?? ""));
  const socketId = request.header("x-socket-id")?.trim();
  if (!socketId) throw new AppError(400, "SOCKET_ID_REQUIRED", "The x-socket-id header is required for ticket updates.");

  const existingLock = ticketLockManager.get(ticketId);
  if (!existingLock) throw new AppError(423, "LOCK_REQUIRED", "Lock this ticket before saving changes.");
  if (!ticketLockManager.isOwnedBy(ticketId, socketId)) {
    throw new AppError(423, "TICKET_LOCKED", `Ticket is locked by ${existingLock.agentName}.`);
  }

  const ticket = await TicketModel.findByIdAndUpdate(ticketId, request.body, { new: true, runValidators: true });
  if (!ticket) throw new AppError(404, "TICKET_NOT_FOUND", "Ticket was not found.");
  return sendSuccess(response, { ticket: serializeTicket(ticket) });
}
