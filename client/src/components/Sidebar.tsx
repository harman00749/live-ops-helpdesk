import { BarChart3, Headset, Inbox, ListChecks, ShieldCheck } from "lucide-react";
import type { TicketStatus } from "../types/ticket";

type Filter = "all" | TicketStatus;

const items: Array<{ value: Filter; label: string; icon: typeof Inbox }> = [
  { value: "all", label: "All tickets", icon: Inbox },
  { value: "open", label: "Open queue", icon: ListChecks },
  { value: "in_progress", label: "In progress", icon: BarChart3 },
  { value: "resolved", label: "Resolved", icon: ShieldCheck },
];

export function Sidebar({ filter, onFilter }: { filter: Filter; onFilter: (value: Filter) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span className="brand-mark small"><Headset size={23} /></span><div><strong>Live Ops</strong><small>Helpdesk command</small></div></div>
      <p className="sidebar-label">Workspace</p>
      <nav>{items.map(({ value, label, icon: Icon }) => <button key={value} className={filter === value ? "active" : ""} onClick={() => onFilter(value)}><Icon size={18} />{label}</button>)}</nav>
      <div className="security-card"><ShieldCheck size={19} /><div><strong>Collision protection</strong><small>Server-authoritative locks</small></div></div>
    </aside>
  );
}
