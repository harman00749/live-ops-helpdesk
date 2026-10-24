export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved";
export type TicketPriority = "critical" | "high" | "medium" | "low";

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  resolution: string;
  assignedAgent: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSummary {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
}

export interface TicketLock {
  ticketId: string;
  socketId: string;
  agentName: string;
  lockedAt: string;
}

export interface TicketUpdate {
  status: TicketStatus;
  resolution: string;
  assignedAgent: string;
}
