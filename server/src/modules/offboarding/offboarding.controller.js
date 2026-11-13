import { offboardingService } from './offboarding.service.js';
import { Employee } from '../employees/employee.model.js';

export const submitResignationController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    let employeeId = req.body.employeeId;

    // If regular employee, default employeeId to their own record
    if (!employeeId) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: req.user._id });
      if (!emp) {
        return res.status(404).json({
          success: false,
          error: { code: 'EMPLOYEE_NOT_FOUND', message: 'No employee record found for your user' },
        });
      }
      employeeId = emp._id;
    }

    const resignation = await offboardingService.submitResignation(orgId, employeeId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: resignation,
      message: 'Resignation request submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getResignationsController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const resignations = await offboardingService.getResignations(orgId, req.query, req.user);
    res.status(200).json({
      success: true,
      data: resignations,
      message: 'Resignations retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getResignationByIdController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const result = await offboardingService.getResignationById(orgId, req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Resignation details retrieved',
    });
  } catch (error) {
    next(error);
  }
};

export const reviewResignationController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const resignation = await offboardingService.reviewResignation(orgId, req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: resignation,
      message: `Resignation reviewed with status ${resignation.status}`,
    });
  } catch (error) {
    next(error);
  }
};

export const withdrawResignationController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const resignation = await offboardingService.withdrawResignation(orgId, req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: resignation,
      message: 'Resignation successfully withdrawn',
    });
  } catch (error) {
    next(error);
  }
};

export const updateClearanceTaskController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const result = await offboardingService.updateClearanceTask(orgId, req.params.taskId, req.body, req.user);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Clearance task status updated',
    });
  } catch (error) {
    next(error);
  }
};

export const calculateSettlementController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const settlement = await offboardingService.calculateSettlement(orgId, req.params.id);
    res.status(200).json({
      success: true,
      data: settlement,
      message: 'Full & final settlement calculations computed',
    });
  } catch (error) {
    next(error);
  }
};

export const finalizeSettlementController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const result = await offboardingService.finalizeSettlement(orgId, req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
