import { z } from "zod";
import { ticketPriorities, ticketStatuses } from "../models/ticket.model.js";

export const createTicketSchema = z.object({
  ticketNumber: z.string().trim().min(3).max(30).transform((value) => value.toUpperCase()),
  subject: z.string().trim().min(5).max(140),
  customerName: z.string().trim().min(2).max(80),
  customerEmail: z.string().trim().email().max(160),
  category: z.string().trim().min(2).max(60),
  priority: z.enum(ticketPriorities),
  status: z.enum(ticketStatuses).default("open"),
  description: z.string().trim().min(10).max(2_000),
  resolution: z.string().trim().max(2_000).default(""),
  assignedAgent: z.string().trim().min(2).max(80).default("Unassigned"),
}).strict();

export const updateTicketSchema = z.object({
  status: z.enum(ticketStatuses),
  resolution: z.string().trim().max(2_000),
  assignedAgent: z.string().trim().min(2).max(80),
}).strict();

export const listTicketQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(ticketStatuses).optional(),
}).strict();
