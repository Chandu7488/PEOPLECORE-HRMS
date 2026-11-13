import { leaveService } from './leave.service.js';
import { organizationService } from '../organization/organization.service.js';
import { Employee } from '../employees/employee.model.js';

export const getLeaveTypesController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const types = await leaveService.getLeaveTypes(org._id);
    res.status(200).json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
};

export const createLeaveTypeController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const type = await leaveService.createLeaveType(org._id, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: type,
      message: `Leave policy "${type.name}" (${type.code}) created with quota ${type.annualQuota} days`,
    });
  } catch (err) {
    next(err);
  }
};

export const updateLeaveTypeController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const type = await leaveService.updateLeaveType(org._id, req.params.id, req.body, req.user._id);
    res.status(200).json({
      success: true,
      data: type,
      message: `Leave policy "${type.name}" (${type.code}) updated successfully`,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteLeaveTypeController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await leaveService.deleteLeaveType(org._id, req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyLeaveBalancesController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const year = req.query.year ? parseInt(req.query.year, 10) : 2026;
    const balances = await leaveService.getEmployeeLeaveBalances(org._id, employee._id, year);

    res.status(200).json({
      success: true,
      data: { balances, year },
      message: 'Leave balances retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const applyLeaveController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const request = await leaveService.applyLeave(org._id, employee._id, req.body);
    res.status(201).json({
      success: true,
      data: request,
      message: 'Leave application submitted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getMyLeaveRequestsController = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const requests = await leaveService.getEmployeeLeaveRequests(employee._id);
    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

export const getTeamLeaveRequestsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    const isHrAdmin = req.user.roles.includes('HR_ADMIN') || req.user.roles.includes('SUPER_ADMIN');

    // HR Admins can view all organization requests; Managers see direct reports
    const approverId = isHrAdmin ? null : employee?._id;
    const requests = await leaveService.getTeamLeaveRequests(org._id, approverId);

    res.status(200).json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
};

export const approveLeaveController = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    const approverId = employee ? employee._id : null;

    const request = await leaveService.approveLeave(req.params.id, approverId, req.body.notes);
    res.status(200).json({
      success: true,
      data: request,
      message: 'Leave request approved and balance debited',
    });
  } catch (err) {
    next(err);
  }
};

export const rejectLeaveController = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    const approverId = employee ? employee._id : null;

    const request = await leaveService.rejectLeave(req.params.id, approverId, req.body.rejectionReason);
    res.status(200).json({
      success: true,
      data: request,
      message: 'Leave request rejected',
    });
  } catch (err) {
    next(err);
  }
};

export const calculateDeductionPreviewController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const { startDate, endDate, isHalfDay } = req.body;
    const preview = await leaveService.calculateLeaveDeduction(org._id, startDate, endDate, !!isHalfDay);
    res.status(200).json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
};
