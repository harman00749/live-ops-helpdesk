import { useState } from "react";
import type { FormEvent } from "react";
import { Headset, Radio, Users } from "lucide-react";

export function AgentSetup({ onJoin }: { onJoin: (agentName: string) => void }) {
  const [name, setName] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = name.trim();
    if (next.length >= 2) onJoin(next);
  };

  return (
    <div className="setup-shell">
      <section className="setup-card">
        <div className="brand-mark"><Headset size={29} /></div>
        <p className="eyebrow"><Radio size={14} /> RapidDispatch Live Operations</p>
        <h1>Enter the live helpdesk</h1>
        <p className="setup-copy">Choose an agent identity for this browser window. Open a second window with another name to demonstrate collision-free collaboration.</p>
        <form onSubmit={submit}>
          <label htmlFor="agent-name">Agent display name</label>
          <div className="setup-input"><Users size={19} /><input id="agent-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Agent A" maxLength={80} /></div>
          <button className="primary-button" disabled={name.trim().length < 2}>Join operations dashboard</button>
        </form>
        <div className="setup-note"><span className="pulse-dot" /> Real-time ticket protection is active</div>
      </section>
    </div>
  );
}
