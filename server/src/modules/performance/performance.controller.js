import { performanceService } from './performance.service.js';
import { Employee } from '../employees/employee.model.js';

export const createGoalController = async (req, res, next) => {
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

    const goal = await performanceService.createGoal(orgId, employeeId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: goal,
      message: 'Goal / OKR created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getGoalsController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const goals = await performanceService.getGoals(orgId, req.query, req.user);
    res.status(200).json({
      success: true,
      data: goals,
      message: 'Goals retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateGoalProgressController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const goal = await performanceService.updateGoalProgress(orgId, req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: goal,
      message: 'Goal progress updated',
    });
  } catch (err) {
    next(err);
  }
};

export const evaluateGoalController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const goal = await performanceService.evaluateGoal(orgId, req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: goal,
      message: 'Manager evaluation recorded',
    });
  } catch (err) {
    next(err);
  }
};
