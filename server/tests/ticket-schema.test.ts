import { describe, expect, it } from "vitest";
import { createTicketSchema, updateTicketSchema } from "../src/schemas/ticket.schema.js";

describe("ticket validation", () => {
  it("accepts a complete ticket payload", () => {
    const result = createTicketSchema.safeParse({
      ticketNumber: "rpd-2001",
      subject: "Truck breakdown on Interstate 35",
      customerName: "Northwind Retail",
      customerEmail: "ops@northwind.example",
      category: "Equipment",
      priority: "critical",
      status: "open",
      description: "The assigned tractor cannot restart after a fuel stop.",
      resolution: "",
      assignedAgent: "Unassigned",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ticketNumber).toBe("RPD-2001");
  });

  it("rejects unknown update fields to keep writes bounded", () => {
    const result = updateTicketSchema.safeParse({
      status: "resolved",
      resolution: "Replacement unit dispatched.",
      assignedAgent: "Agent A",
      unauthorizedField: "overwrite",
    });
    expect(result.success).toBe(false);
  });
});
