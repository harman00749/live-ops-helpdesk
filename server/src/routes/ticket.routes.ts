import { Router } from "express";
import { createTicket, listTickets, updateTicket } from "../controllers/ticket.controller.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { createTicketSchema, listTicketQuerySchema, updateTicketSchema } from "../schemas/ticket.schema.js";
import { asyncHandler } from "../utils/async-handler.js";

export const ticketRouter = Router();

ticketRouter.get("/", validateQuery(listTicketQuerySchema), asyncHandler(listTickets));
ticketRouter.post("/", validateBody(createTicketSchema), asyncHandler(createTicket));
ticketRouter.put("/:id", validateBody(updateTicketSchema), asyncHandler(updateTicket));
