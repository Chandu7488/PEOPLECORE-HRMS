import { expenseService } from './expense.service.js';
import { Employee } from '../employees/employee.model.js';

export const submitClaimController = async (req, res, next) => {
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

    const claim = await expenseService.submitClaim(orgId, employeeId, req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: claim,
      message: 'Expense claim submitted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getClaimsController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const claims = await expenseService.getClaims(orgId, req.query, req.user);
    res.status(200).json({
      success: true,
      data: claims,
      message: 'Expense claims retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const reviewClaimController = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const claim = await expenseService.reviewClaim(orgId, req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      data: claim,
      message: `Expense claim reviewed with status ${claim.status}`,
    });
  } catch (err) {
    next(err);
  }
};
