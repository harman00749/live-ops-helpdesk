import { beforeEach, describe, expect, it } from "vitest";
import { TicketLockManager } from "../src/realtime/lock-manager.js";

describe("TicketLockManager", () => {
  let manager: TicketLockManager;

  beforeEach(() => { manager = new TicketLockManager(); });

  it("grants the first lock and rejects a competing socket", () => {
    expect(manager.acquire("ticket-1", "socket-a", "Agent A").ok).toBe(true);
    const collision = manager.acquire("ticket-1", "socket-b", "Agent B");
    expect(collision.ok).toBe(false);
    expect(collision.code).toBe("ALREADY_LOCKED");
    expect(collision.lock?.agentName).toBe("Agent A");
  });

  it("makes reacquisition by the owner idempotent", () => {
    const first = manager.acquire("ticket-1", "socket-a", "Agent A");
    const second = manager.acquire("ticket-1", "socket-a", "Agent A");
    expect(second.ok).toBe(true);
    expect(second.lock?.lockedAt).toBe(first.lock?.lockedAt);
    expect(manager.snapshot()).toHaveLength(1);
  });

  it("does not let another socket release the lock", () => {
    manager.acquire("ticket-1", "socket-a", "Agent A");
    expect(manager.release("ticket-1", "socket-b").code).toBe("NOT_OWNER");
    expect(manager.snapshot()).toHaveLength(1);
  });

  it("releases every lock owned by a disconnected socket", () => {
    manager.acquire("ticket-1", "socket-a", "Agent A");
    manager.acquire("ticket-2", "socket-a", "Agent A");
    manager.acquire("ticket-3", "socket-b", "Agent B");
    const released = manager.releaseAllBySocket("socket-a");
    expect(released.map((lock) => lock.ticketId)).toEqual(["ticket-1", "ticket-2"]);
    expect(manager.snapshot().map((lock) => lock.ticketId)).toEqual(["ticket-3"]);
  });
});
