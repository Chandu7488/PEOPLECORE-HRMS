import { helpdeskService } from './helpdesk.service.js';
import { Employee } from '../employees/employee.model.js';

export const createTicketController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let employeeId = req.body.employeeId;

    if (!employeeId) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: req.user._id });
      if (!emp) {
        return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
      }
      employeeId = emp._id;
    }

    const ticket = await helpdeskService.createTicket(orgId, employeeId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket submitted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getTicketsController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const tickets = await helpdeskService.getTickets(orgId, req.query, req.user);
    res.status(200).json({
      success: true,
      data: tickets,
      message: 'Helpdesk tickets retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateTicketStatusController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const ticket = await helpdeskService.updateTicketStatus(orgId, req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: ticket,
      message: `Ticket updated to ${ticket.status}`,
    });
  } catch (err) {
    next(err);
  }
};
