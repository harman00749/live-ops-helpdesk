import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "../services/api";
import type { TicketLock } from "../types/ticket";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL.replace(/\/api$/, "")).replace(/\/$/, "");

interface Ack {
  ok: boolean;
  message?: string;
  code?: string;
  lock?: TicketLock;
  locks?: TicketLock[];
}

export function useRealtimeLocks(agentName: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState("");
  const [locks, setLocks] = useState<TicketLock[]>([]);
  const [activity, setActivity] = useState("Waiting for live activity…");

  useEffect(() => {
    if (!agentName) return;
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"], reconnection: true });
    socketRef.current = socket;

    const join = () => {
      setConnected(true);
      setSocketId(socket.id ?? "");
      socket.emit("join_dashboard", { agentName }, (ack: Ack) => {
        if (ack.locks) setLocks(ack.locks);
      });
    };

    socket.on("connect", join);
    socket.on("disconnect", () => {
      setConnected(false);
      setSocketId("");
    });
    socket.on("lock_state", (nextLocks: TicketLock[]) => setLocks(nextLocks));
    socket.on("ticket_locked", (lock: TicketLock) => setActivity(`${lock.agentName} locked a ticket.`));
    socket.on("ticket_unlocked", ({ reason }: { ticketId: string; reason: string }) => {
      setActivity(reason === "ghost_disconnect" ? "Ghost disconnect detected — ticket released automatically." : "Ticket released for the team.");
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [agentName]);

  const lockTicket = useCallback((ticketId: string) => new Promise<Ack>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, message: "Live connection is unavailable." });
    socket.emit("lock_ticket", { ticketId, agentName }, resolve);
  }), [agentName]);

  const unlockTicket = useCallback((ticketId: string) => new Promise<Ack>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, message: "Live connection is unavailable." });
    socket.emit("unlock_ticket", { ticketId }, resolve);
  }), []);

  return { connected, socketId, locks, activity, lockTicket, unlockTicket };
}
