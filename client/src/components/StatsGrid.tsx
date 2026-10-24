import { CheckCircle2, CircleDot, Clock3, Tickets } from "lucide-react";
import type { TicketSummary } from "../types/ticket";

export function StatsGrid({ summary, activeLocks }: { summary: TicketSummary; activeLocks: number }) {
  const items = [
    { label: "Active tickets", value: summary.total - summary.resolved, hint: `${summary.total} total`, icon: Tickets, tone: "blue" },
    { label: "Open queue", value: summary.open, hint: "Needs ownership", icon: CircleDot, tone: "orange" },
    { label: "Live locks", value: activeLocks, hint: "Protected now", icon: Clock3, tone: "purple" },
    { label: "Resolved", value: summary.resolved, hint: "Completed", icon: CheckCircle2, tone: "green" },
  ];
  return <section className="stats-grid">{items.map(({ label, value, hint, icon: Icon, tone }) => <article className="stat-card" key={label}><span className={`stat-icon ${tone}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p>{hint}</p></div></article>)}</section>;
}
