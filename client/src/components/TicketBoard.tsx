import { Clock3, LockKeyhole, Radio, UserRound } from "lucide-react";
import type { Ticket, TicketLock, TicketStatus } from "../types/ticket";

const columns: Array<{ status: TicketStatus; label: string }> = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In progress" },
  { status: "waiting", label: "Waiting" },
  { status: "resolved", label: "Resolved" },
];

const formatTime = (value: string) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));

interface Props {
  tickets: Ticket[];
  locks: TicketLock[];
  socketId: string;
  onOpen: (ticket: Ticket) => void;
}

export function TicketBoard({ tickets, locks, socketId, onOpen }: Props) {
  const lockByTicket = new Map(locks.map((lock) => [lock.ticketId, lock]));
  return (
    <section className="ticket-board">
      {columns.map((column) => {
        const items = tickets.filter((ticket) => ticket.status === column.status);
        return <div className="ticket-column" key={column.status}>
          <div className="column-title"><div><span className={`status-dot ${column.status}`} />{column.label}</div><span>{items.length}</span></div>
          <div className="ticket-stack">
            {items.map((ticket) => {
              const lock = lockByTicket.get(ticket.id);
              const isMine = lock?.socketId === socketId;
              return <button className={`ticket-card ${lock ? "locked" : ""}`} key={ticket.id} onClick={() => onOpen(ticket)}>
                <div className="ticket-card-top"><span>{ticket.ticketNumber}</span><span className={`priority ${ticket.priority}`}>{ticket.priority}</span></div>
                <h3>{ticket.subject}</h3>
                <p>{ticket.description}</p>
                {lock && <div className={`lock-banner ${isMine ? "mine" : ""}`}><LockKeyhole size={14} />{isMine ? "You are editing" : `Locked by ${lock.agentName}`}</div>}
                <div className="ticket-meta"><span><UserRound size={14} />{ticket.customerName}</span><span><Clock3 size={14} />{formatTime(ticket.updatedAt)}</span></div>
                {!lock && <span className="available"><Radio size={13} />Available to claim</span>}
              </button>;
            })}
            {items.length === 0 && <div className="empty-column">No tickets in this stage</div>}
          </div>
        </div>;
      })}
    </section>
  );
}
