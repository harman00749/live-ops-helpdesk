import { useEffect, useMemo, useState } from "react";
import { Bell, LockKeyhole, Radio, RefreshCw, Search, UserRoundCog, Wifi, WifiOff } from "lucide-react";
import { AgentSetup } from "./components/AgentSetup";
import { Sidebar } from "./components/Sidebar";
import { StatsGrid } from "./components/StatsGrid";
import { TicketBoard } from "./components/TicketBoard";
import { TicketDrawer } from "./components/TicketDrawer";
import { useRealtimeLocks } from "./hooks/useRealtimeLocks";
import { getTickets, updateTicket } from "./services/api";
import type { Ticket, TicketStatus, TicketSummary, TicketUpdate } from "./types/ticket";

type Filter = "all" | TicketStatus;
const emptySummary: TicketSummary = { total: 0, open: 0, inProgress: 0, waiting: 0, resolved: 0 };

function App() {
  const [agentName, setAgentName] = useState(() => sessionStorage.getItem("live-ops-agent") ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<TicketSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const realtime = useRealtimeLocks(agentName);

  useEffect(() => {
    if (!agentName) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getTickets(search, filter === "all" ? undefined : filter, controller.signal);
        setTickets(result.tickets);
        setSummary(result.summary);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load tickets.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [agentName, filter, refreshKey, search]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3_600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const displayedLocks = useMemo(() => realtime.locks.filter((lock) => tickets.some((ticket) => ticket.id === lock.ticketId)), [realtime.locks, tickets]);

  const join = (name: string) => {
    sessionStorage.setItem("live-ops-agent", name);
    setAgentName(name);
  };

  const switchAgent = () => {
    sessionStorage.removeItem("live-ops-agent");
    setSelectedTicket(null);
    setAgentName("");
  };

  const openTicket = async (ticket: Ticket) => {
    const existing = realtime.locks.find((lock) => lock.ticketId === ticket.id);
    if (existing && existing.socketId !== realtime.socketId) {
      setToast(`Protected: ${existing.agentName} is editing ${ticket.ticketNumber}.`);
      return;
    }
    const result = await realtime.lockTicket(ticket.id);
    if (!result.ok) {
      setToast(result.message ?? "Ticket lock was rejected.");
      return;
    }
    setSelectedTicket(ticket);
  };

  const closeTicket = async () => {
    if (selectedTicket) await realtime.unlockTicket(selectedTicket.id);
    setSelectedTicket(null);
  };

  const saveTicket = async (input: TicketUpdate) => {
    if (!selectedTicket || !realtime.socketId) return;
    setSaving(true);
    try {
      const updated = await updateTicket(selectedTicket.id, input, realtime.socketId);
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      await realtime.unlockTicket(selectedTicket.id);
      setSelectedTicket(null);
      setToast(`${updated.ticketNumber} saved and released to the team.`);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setToast(saveError instanceof Error ? saveError.message : "Ticket could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!agentName) return <AgentSetup onJoin={join} />;

  return <div className="app-shell">
    <Sidebar filter={filter} onFilter={setFilter} />
    <main className="main-content">
      <header className="topbar">
        <div><p className="eyebrow"><Radio size={14} /> Live freight support</p><h1>Operations command center</h1><p>Protect every resolution from agent collisions in real time.</p></div>
        <div className="topbar-actions">
          <span className={`connection-pill ${realtime.connected ? "online" : "offline"}`}>{realtime.connected ? <Wifi size={16} /> : <WifiOff size={16} />}{realtime.connected ? "Live sync" : "Reconnecting"}</span>
          <button className="icon-button" aria-label="Refresh tickets" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={19} /></button>
          <button className="agent-button" onClick={switchAgent}><UserRoundCog size={18} /><span>{agentName}</span></button>
        </div>
      </header>

      <section className="activity-strip"><span><Bell size={15} />Live activity</span><p>{realtime.activity}</p><strong><LockKeyhole size={14} />{realtime.locks.length} active locks</strong></section>
      <StatsGrid summary={summary} activeLocks={realtime.locks.length} />

      <section className="queue-toolbar">
        <div><p className="eyebrow">Support queue</p><h2>{filter === "all" ? "All active tickets" : filter.replace("_", " ")}</h2></div>
        <label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket, customer or issue…" /></label>
      </section>

      {error && <div className="error-banner">{error}<button onClick={() => setRefreshKey((value) => value + 1)}>Try again</button></div>}
      {loading ? <div className="board-skeleton">{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div> : <TicketBoard tickets={tickets} locks={displayedLocks} socketId={realtime.socketId} onOpen={openTicket} />}
    </main>

    {selectedTicket && <TicketDrawer ticket={selectedTicket} agentName={agentName} connected={realtime.connected} saving={saving} onClose={closeTicket} onSave={saveTicket} />}
    {toast && <div className="toast"><LockKeyhole size={17} />{toast}</div>}
  </div>;
}

export default App;
