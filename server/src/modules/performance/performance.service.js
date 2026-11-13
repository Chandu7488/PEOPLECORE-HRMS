import { Goal } from './goal.model.js';
import { Employee } from '../employees/employee.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

export class PerformanceService {
  async createGoal(orgId, employeeId, data, actorUserId = null) {
    const goal = await Goal.create({
      organizationId: orgId,
      employeeId,
      title: data.title,
      category: data.category || 'PROJECT',
      description: data.description || '',
      targetDate: data.targetDate || null,
      progressPercentage: Number(data.progressPercentage) || 0,
      weightage: Number(data.weightage) || 25,
      status: data.status || 'IN_PROGRESS',
      year: Number(data.year) || new Date().getFullYear(),
    });

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'PERFORMANCE_GOAL_CREATED',
      entity: 'Goal',
      entityId: goal._id,
      metadata: { title: goal.title, employeeId },
    });

    return goal;
  }

  async getGoals(orgId, filters = {}, user) {
    const isPrivileged =
      user.roles.includes('SUPER_ADMIN') ||
      user.roles.includes('HR_ADMIN') ||
      user.roles.includes('HR_EXECUTIVE') ||
      user.roles.includes('MANAGER');

    const query = { organizationId: orgId };

    if (!isPrivileged) {
      const emp = await Employee.findOne({ organizationId: orgId, userId: user._id });
      if (!emp) return [];
      query.employeeId = emp._id;
    } else if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.year) {
      query.year = Number(filters.year);
    }

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    return await Goal.find(query)
      .populate('employeeId', 'firstName lastName employeeCode workEmail')
      .sort({ createdAt: -1 });
  }

  async updateGoalProgress(orgId, goalId, data, user) {
    const goal = await Goal.findOne({ _id: goalId, organizationId: orgId });
    if (!goal) {
      const err = new Error('Goal not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.progressPercentage !== undefined) {
      goal.progressPercentage = Number(data.progressPercentage);
      if (goal.progressPercentage >= 100) {
        goal.status = 'COMPLETED';
      } else if (goal.progressPercentage > 0) {
        goal.status = 'IN_PROGRESS';
      }
    }

    if (data.status) goal.status = data.status;
    if (data.selfRating !== undefined) goal.selfRating = Number(data.selfRating);
    if (data.title) goal.title = data.title;
    if (data.description !== undefined) goal.description = data.description;

    await goal.save();
    return goal;
  }

  async evaluateGoal(orgId, goalId, data, managerUser) {
    const goal = await Goal.findOne({ _id: goalId, organizationId: orgId });
    if (!goal) {
      const err = new Error('Goal not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.managerRating !== undefined) goal.managerRating = Number(data.managerRating);
    if (data.managerFeedback !== undefined) goal.managerFeedback = data.managerFeedback;

    await goal.save();

    await recordAuditLog({
      organizationId: orgId,
      userId: managerUser._id,
      action: 'PERFORMANCE_GOAL_EVALUATED',
      entity: 'Goal',
      entityId: goal._id,
      metadata: { rating: goal.managerRating },
    });

    return goal;
  }
}

export const performanceService = new PerformanceService();
