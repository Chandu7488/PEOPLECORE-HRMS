import { HelpdeskTicket } from './helpdesk.model.js';
import { Employee } from '../employees/employee.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

export class HelpdeskService {
  async generateTicketNumber(orgId) {
    const year = new Date().getFullYear();
    const count = await HelpdeskTicket.countDocuments({ organizationId: orgId });
    let ticketNumber = `TICK-${year}-${String(count + 1).padStart(3, '0')}`;
    let exists = await HelpdeskTicket.exists({ organizationId: orgId, ticketNumber });
    let increment = 1;
    while (exists) {
      ticketNumber = `TICK-${year}-${String(count + 1 + increment).padStart(3, '0')}`;
      exists = await HelpdeskTicket.exists({ organizationId: orgId, ticketNumber });
      increment++;
    }
    return ticketNumber;
  }

  async createTicket(orgId, employeeId, data, actorUserId = null) {
    const ticketNumber = await this.generateTicketNumber(orgId);

    const ticket = await HelpdeskTicket.create({
      organizationId: orgId,
      ticketNumber,
      employeeId,
      category: data.category || 'IT_SUPPORT',
      priority: data.priority || 'MEDIUM',
      subject: data.subject,
      description: data.description,
      status: 'OPEN',
    });

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'HELPDESK_TICKET_CREATED',
      entity: 'HelpdeskTicket',
      entityId: ticket._id,
      metadata: { ticketNumber: ticket.ticketNumber, subject: ticket.subject },
    });

    return ticket;
  }

  async getTickets(orgId, filters = {}, user) {
    const isPrivileged =
      user.roles.includes('SUPER_ADMIN') ||
      user.roles.includes('HR_ADMIN') ||
      user.roles.includes('HR_EXECUTIVE');

    const query = { organizationId: orgId };

    if (!isPrivileged) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: user._id });
      if (!emp) return [];
      query.employeeId = emp._id;
    } else if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.category && filters.category !== 'ALL') {
      query.category = filters.category;
    }

    if (filters.search) {
      const regex = new RegExp(filters.search, 'i');
      query.$or = [{ subject: regex }, { ticketNumber: regex }, { description: regex }];
    }

    return await HelpdeskTicket.find(query)
      .populate('employeeId', 'firstName lastName employeeCode workEmail')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  async updateTicketStatus(orgId, ticketId, data, actorUser) {
    const ticket = await HelpdeskTicket.findOne({ _id: ticketId, organizationId: orgId });
    if (!ticket) {
      const err = new Error('Ticket not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.status) {
      ticket.status = data.status;
      if (['RESOLVED', 'CLOSED'].includes(data.status)) {
        ticket.resolvedAt = new Date();
      }
    }

    if (data.resolutionNotes !== undefined) ticket.resolutionNotes = data.resolutionNotes;
    if (data.assignedTo !== undefined) ticket.assignedTo = data.assignedTo;
    if (data.priority !== undefined) ticket.priority = data.priority;

    await ticket.save();

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUser._id,
      action: 'HELPDESK_TICKET_UPDATED',
      entity: 'HelpdeskTicket',
      entityId: ticket._id,
      metadata: { status: ticket.status, ticketNumber: ticket.ticketNumber },
    });

    return ticket;
  }
}

export const helpdeskService = new HelpdeskService();
