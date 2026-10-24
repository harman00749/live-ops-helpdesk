import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LockKeyhole, Mail, Save, ShieldCheck, UserRound, X } from "lucide-react";
import type { Ticket, TicketStatus, TicketUpdate } from "../types/ticket";

interface Props {
  ticket: Ticket;
  agentName: string;
  connected: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (value: TicketUpdate) => void;
}

export function TicketDrawer({ ticket, agentName, connected, saving, onClose, onSave }: Props) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [resolution, setResolution] = useState(ticket.resolution);
  useEffect(() => { setStatus(ticket.status); setResolution(ticket.resolution); }, [ticket]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({ status, resolution, assignedAgent: agentName });
  };

  return <div className="drawer-backdrop" role="presentation">
    <aside className="ticket-drawer" role="dialog" aria-modal="true" aria-labelledby="ticket-title">
      <header><div><span className="locked-label"><LockKeyhole size={14} />Exclusive edit lock active</span><p>{ticket.ticketNumber}</p><h2 id="ticket-title">{ticket.subject}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close and release ticket"><X /></button></header>
      <div className="drawer-body">
        <div className="customer-card"><div><UserRound size={18} /><span><small>Customer</small><strong>{ticket.customerName}</strong></span></div><div><Mail size={18} /><span><small>Contact</small><strong>{ticket.customerEmail}</strong></span></div></div>
        <section><label>Issue description</label><p className="description-box">{ticket.description}</p></section>
        <form onSubmit={submit}>
          <div className="form-grid"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as TicketStatus)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="waiting">Waiting</option><option value="resolved">Resolved</option></select></label><label>Assigned agent<input value={agentName} readOnly /></label></div>
          <label>Resolution notes<textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Document the action taken for this freight issue…" rows={7} maxLength={2000} /></label>
          <div className="drawer-proof"><ShieldCheck size={18} /><span><strong>Race-safe save</strong><small>The API verifies this browser's socket lock before writing.</small></span></div>
          <div className="drawer-actions"><button type="button" className="secondary-button" onClick={onClose}>Release ticket</button><button className="primary-button inline" disabled={saving || !connected}><Save size={17} />{saving ? "Saving…" : "Save & release"}</button></div>
        </form>
      </div>
    </aside>
  </div>;
}
