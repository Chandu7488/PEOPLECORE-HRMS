import { attendanceService } from './attendance.service.js';
import { organizationService } from '../organization/organization.service.js';
import { Employee } from '../employees/employee.model.js';

export const recordPunchController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const { type, location, idempotencyKey } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';

    const result = await attendanceService.recordPunch(org._id, employee._id, {
      type: type || 'IN',
      source: 'WEB',
      ipAddress,
      location: location || 'Web Clock Widget',
      idempotencyKey,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Clocked ${type === 'IN' ? 'in' : 'out'} successfully`,
    });
  } catch (err) {
    next(err);
  }
};

export const getTodayStatusController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const todayData = await attendanceService.getTodaySummary(org._id, employee._id);
    res.status(200).json({ success: true, data: todayData });
  } catch (err) {
    next(err);
  }
};

export const getMyTimesheetController = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const year = req.query.year ? parseInt(req.query.year, 10) : 2026;
    const month = req.query.month ? parseInt(req.query.month, 10) : new Date().getMonth() + 1;

    const timesheet = await attendanceService.getMonthlyTimesheet(employee._id, year, month);
    res.status(200).json({ success: true, data: timesheet });
  } catch (err) {
    next(err);
  }
};

export const getShiftsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const shifts = await attendanceService.getShifts(org._id);
    res.status(200).json({ success: true, data: shifts });
  } catch (err) {
    next(err);
  }
};

export const createShiftController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const shift = await attendanceService.createShift(org._id, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: shift,
      message: `Shift "${shift.name}" (${shift.startTime} - ${shift.endTime}) created successfully`,
    });
  } catch (err) {
    next(err);
  }
};

export const updateShiftController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const shift = await attendanceService.updateShift(org._id, req.params.id, req.body, req.user._id);
    res.status(200).json({
      success: true,
      data: shift,
      message: `Shift "${shift.name}" updated successfully`,
    });
  } catch (err) {
    next(err);
  }
};

export const setDefaultShiftController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const shift = await attendanceService.setDefaultShift(org._id, req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      data: shift,
      message: `Shift "${shift.name}" set as organization default schedule`,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteShiftController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await attendanceService.deleteShift(org._id, req.params.id, req.user._id);
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const submitRegularizationController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const reg = await attendanceService.submitRegularization(org._id, employee._id, req.body);
    res.status(201).json({
      success: true,
      data: reg,
      message: 'Regularization request submitted for approval',
    });
  } catch (err) {
    next(err);
  }
};

export const approveRegularizationController = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    const approverId = employee ? employee._id : null;

    const result = await attendanceService.approveRegularization(req.params.id, approverId);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Attendance regularized and marked PRESENT',
    });
  } catch (err) {
    next(err);
  }
};
