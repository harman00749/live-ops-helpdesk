export interface TicketLock {
  ticketId: string;
  socketId: string;
  agentName: string;
  lockedAt: string;
}

export interface LockResult {
  ok: boolean;
  lock?: TicketLock;
  code?: "ALREADY_LOCKED" | "NOT_OWNER" | "NOT_LOCKED";
  message?: string;
}

export class TicketLockManager {
  private readonly locks = new Map<string, TicketLock>();

  acquire(ticketId: string, socketId: string, agentName: string): LockResult {
    const existing = this.locks.get(ticketId);
    if (existing) {
      if (existing.socketId === socketId) return { ok: true, lock: existing };
      return { ok: false, code: "ALREADY_LOCKED", message: `Ticket is currently locked by ${existing.agentName}.`, lock: existing };
    }

    const lock: TicketLock = { ticketId, socketId, agentName, lockedAt: new Date().toISOString() };
    this.locks.set(ticketId, lock);
    return { ok: true, lock };
  }

  release(ticketId: string, socketId: string): LockResult {
    const existing = this.locks.get(ticketId);
    if (!existing) return { ok: false, code: "NOT_LOCKED", message: "Ticket is not locked." };
    if (existing.socketId !== socketId) {
      return { ok: false, code: "NOT_OWNER", message: `Ticket lock belongs to ${existing.agentName}.`, lock: existing };
    }
    this.locks.delete(ticketId);
    return { ok: true, lock: existing };
  }

  releaseAllBySocket(socketId: string): TicketLock[] {
    const released: TicketLock[] = [];
    for (const [ticketId, lock] of this.locks.entries()) {
      if (lock.socketId === socketId) {
        this.locks.delete(ticketId);
        released.push(lock);
      }
    }
    return released;
  }

  isOwnedBy(ticketId: string, socketId: string): boolean {
    return this.locks.get(ticketId)?.socketId === socketId;
  }

  get(ticketId: string): TicketLock | undefined {
    return this.locks.get(ticketId);
  }

  snapshot(): TicketLock[] {
    return [...this.locks.values()].sort((a, b) => a.ticketId.localeCompare(b.ticketId));
  }

  clear(): void {
    this.locks.clear();
  }
}

export const ticketLockManager = new TicketLockManager();
