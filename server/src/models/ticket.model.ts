import { model, Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

export const ticketStatuses = ["open", "in_progress", "waiting", "resolved"] as const;
export const ticketPriorities = ["critical", "high", "medium", "low"] as const;

const ticketSchema = new Schema({
  ticketNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  subject: { type: String, required: true, trim: true, maxlength: 140 },
  customerName: { type: String, required: true, trim: true, maxlength: 80 },
  customerEmail: { type: String, required: true, trim: true, lowercase: true },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  priority: { type: String, enum: ticketPriorities, required: true, default: "medium" },
  status: { type: String, enum: ticketStatuses, required: true, default: "open" },
  description: { type: String, required: true, trim: true, maxlength: 2_000 },
  resolution: { type: String, trim: true, maxlength: 2_000, default: "" },
  assignedAgent: { type: String, trim: true, maxlength: 80, default: "Unassigned" },
}, {
  timestamps: true,
  versionKey: false,
});

ticketSchema.index({ status: 1, updatedAt: -1 }, { name: "status_updated_idx" });
ticketSchema.index({ priority: 1, updatedAt: -1 }, { name: "priority_updated_idx" });
ticketSchema.index({ subject: "text", ticketNumber: "text", customerName: "text" }, { name: "ticket_search_idx" });

export type Ticket = InferSchemaType<typeof ticketSchema>;
export type TicketDocument = HydratedDocument<Ticket>;
export const TicketModel = model<Ticket>("Ticket", ticketSchema);

export function serializeTicket(ticket: TicketDocument) {
  const value = ticket.toObject();
  return {
    id: ticket.id as string,
    ticketNumber: value.ticketNumber,
    subject: value.subject,
    customerName: value.customerName,
    customerEmail: value.customerEmail,
    category: value.category,
    priority: value.priority,
    status: value.status,
    description: value.description,
    resolution: value.resolution,
    assignedAgent: value.assignedAgent,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}
