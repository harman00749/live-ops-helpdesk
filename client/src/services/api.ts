import type { Ticket, TicketStatus, TicketSummary, TicketUpdate } from "../types/ticket";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

interface SuccessEnvelope<T> { success: true; data: T }
interface ErrorEnvelope { success: false; error: { code: string; message: string; details?: unknown } }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const payload = await response.json() as SuccessEnvelope<T> | ErrorEnvelope;
  if (!response.ok || !payload.success) {
    throw new Error(!payload.success ? payload.error.message : "Request failed.");
  }
  return payload.data;
}

export async function getTickets(search = "", status?: TicketStatus, signal?: AbortSignal) {
  const parameters = new URLSearchParams();
  if (search.trim()) parameters.set("search", search.trim());
  if (status) parameters.set("status", status);
  const suffix = parameters.size ? `?${parameters.toString()}` : "";
  return request<{ tickets: Ticket[]; summary: TicketSummary }>(`/tickets${suffix}`, { signal });
}

export async function updateTicket(ticketId: string, input: TicketUpdate, socketId: string): Promise<Ticket> {
  const result = await request<{ ticket: Ticket }>(`/tickets/${ticketId}`, {
    method: "PUT",
    headers: { "x-socket-id": socketId },
    body: JSON.stringify(input),
  });
  return result.ticket;
}
