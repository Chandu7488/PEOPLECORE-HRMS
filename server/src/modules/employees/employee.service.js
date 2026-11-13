import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Employee } from './employee.model.js';
import { EmployeeJobHistory } from './jobHistory.model.js';
import { User } from '../users/user.model.js';
import { PasswordResetToken } from '../auth/token.model.js';
import { Department } from '../organization/department.model.js';
import { Designation } from '../organization/designation.model.js';
import { Location } from '../organization/location.model.js';
import { Organization } from '../organization/organization.model.js';
import { ROLES } from '../../config/roles.js';
import { ENV } from '../../config/env.js';
import { emailService } from '../../utils/emailService.js';
import { recordAuditLog } from '../audit/audit.model.js';
import { LeaveType } from '../leave/leaveType.model.js';
import { LeaveLedger } from '../leave/leaveLedger.model.js';
import { LeaveRequest } from '../leave/leaveRequest.model.js';
import { leaveService } from '../leave/leave.service.js';
import { AttendanceDay } from '../attendance/attendanceDay.model.js';
import { Shift } from '../attendance/shift.model.js';
import { EmployeeSalary } from '../payroll/employeeSalary.model.js';
import { Payslip } from '../payroll/payslip.model.js';
import { Asset } from '../assets/asset.model.js';
import { Goal } from '../performance/goal.model.js';

/**
 * Employee Management Service
 * Manages employee directory, lifecycle transitions, and job history audit trails
 */
export class EmployeeService {
  /**
   * Generates next available unique employee code (e.g. EMP001, EMP002)
   * @param {string} orgId - Organization ID
   * @returns {Promise<string>} Next code
   */
  async generateNextEmployeeCode(orgId) {
    const lastEmployee = await Employee.findOne({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .select('employeeCode');

    if (!lastEmployee || !lastEmployee.employeeCode.startsWith('EMP')) {
      return 'EMP001';
    }

    const numericPart = parseInt(lastEmployee.employeeCode.replace('EMP', ''), 10);
    const nextNum = isNaN(numericPart) ? 1 : numericPart + 1;
    return `EMP${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Creates new employee and automatically logs JOINING history
   * @param {string} orgId - Organization ID
   * @param {object} employeeData - Employee details
   * @param {string} createdByUserId - User ID of creator
   */
  async createEmployee(orgId, employeeData, createdByUserId = null) {
    const workEmail = (employeeData.workEmail || '').toLowerCase().trim();
    if (!workEmail) {
      throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Work email is required' };
    }

    // Check unique work email
    const existingEmail = await Employee.findOne({ organizationId: orgId, workEmail });
    if (existingEmail) {
      throw { statusCode: 409, code: 'DUPLICATE_EMAIL', message: `Employee with work email '${workEmail}' already exists` };
    }

    // Ensure or auto-generate employee code
    let employeeCode = (employeeData.employeeCode || '').toUpperCase().trim();
    if (!employeeCode) {
      employeeCode = await this.generateNextEmployeeCode(orgId);
    } else {
      const existingCode = await Employee.findOne({ organizationId: orgId, employeeCode });
      if (existingCode) {
        throw { statusCode: 409, code: 'DUPLICATE_CODE', message: `Employee with code '${employeeCode}' already exists` };
      }
    }

    // Create Employee record
    const employee = await Employee.create({
      ...employeeData,
      organizationId: orgId,
      employeeCode,
      workEmail,
    });

    // Automatically record initial JOINING job history
    await EmployeeJobHistory.create({
      employeeId: employee._id,
      organizationId: orgId,
      changeType: 'JOINING',
      effectiveDate: employee.joiningDate || new Date(),
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      locationId: employee.locationId,
      managerId: employee.managerId,
      status: employee.status,
      notes: 'Initial employee appointment / joining record',
      changedBy: createdByUserId,
    });

    // Link or Auto-provision user account so employee can log in immediately
    let user = await User.findOne({ email: workEmail });
    let activationUrl = null;

    if (user) {
      employee.userId = user._id;
      await employee.save();
      user.employeeId = employee._id;
      await user.save();
    } else {
      // Auto-provision User account
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days window

      const tempPassword = `Welcome@${new Date().getFullYear()}`;
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      user = await User.create({
        organizationId: orgId,
        employeeId: employee._id,
        email: workEmail,
        firstName: employee.firstName,
        lastName: employee.lastName,
        passwordHash,
        roles: [ROLES.EMPLOYEE],
        status: 'ACTIVE',
        resetPasswordToken: tokenHash,
        resetPasswordExpiresAt: tokenExpiresAt,
      });

      employee.userId = user._id;
      await employee.save();

      // Store in PasswordResetToken collection for reset workflow
      await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        purpose: 'INVITE',
        expiresAt: tokenExpiresAt,
      });

      activationUrl = `${ENV.CLIENT_URL}/reset-password?token=${rawToken}`;

      // Dispatch Welcome & Invitation Email (delivers to Mailpit and terminal)
      try {
        const dept = employee.departmentId ? await Department.findById(employee.departmentId) : null;
        const org = await Organization.findById(orgId);
        await emailService.sendWelcomeAndInvitationEmail({
          toEmail: workEmail,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeCode,
          departmentName: dept?.name || 'General',
          resetUrl: activationUrl,
          tempPassword,
          organizationName: org?.name || 'PeopleCore Technologies Ltd.',
        });
      } catch (err) {
        console.warn('⚠️ Could not dispatch welcome email:', err.message);
      }
    }

    await recordAuditLog({
      action: 'EMPLOYEE_CREATED',
      actorId: createdByUserId,
      targetId: employee._id.toString(),
      metadata: { employeeCode, workEmail, userProvisioned: !!user },
    });

    const populated = await this.getEmployeeById(employee._id);
    const resultObj = populated.toObject ? populated.toObject() : populated;
    if (activationUrl) {
      resultObj.activationUrl = activationUrl;
    }
    return resultObj;
  }

  /**
   * Retrieves paginated list of employees with search and filters
   */
  async getEmployees(orgId, query = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      departmentId,
      designationId,
      locationId,
      status,
      userId,
      userEmail,
    } = query;

    const filter = { organizationId: orgId };

    if (userId || userEmail) {
      const userFilters = [];
      if (userId) userFilters.push({ userId });
      if (userEmail) userFilters.push({ workEmail: userEmail.toLowerCase().trim() });
      filter.$or = userFilters;
    }

    if (departmentId) filter.departmentId = departmentId;
    if (designationId) filter.designationId = designationId;
    if (locationId) filter.locationId = locationId;
    if (status) filter.status = status;

    if (search) {
      const trimmedSearch = search.trim();
      const regex = new RegExp(trimmedSearch, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { employeeCode: regex },
        { workEmail: regex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: trimmedSearch,
              options: 'i',
            },
          },
        },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('departmentId', 'name code')
        .populate('designationId', 'title code level')
        .populate('locationId', 'name city state')
        .populate('managerId', 'firstName lastName employeeCode workEmail')
        .sort({ employeeCode: 1 })
        .skip(skip)
        .limit(limitNum),
      Employee.countDocuments(filter),
    ]);

    return {
      employees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Retrieves single employee profile by ID with all relations populated
   */
  async getEmployeeById(id) {
    const employee = await Employee.findById(id)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code level')
      .populate('locationId', 'name city state country timezone')
      .populate('managerId', 'firstName lastName employeeCode workEmail')
      .populate('userId', 'email roles status');

    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    return employee;
  }

  /**
   * Updates basic employee information
   */
  async updateEmployee(id, updateData, changedByUserId = null) {
    // Prevent updating critical immutable identity fields through basic update
    delete updateData.employeeCode;
    delete updateData.organizationId;

    const employee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code level')
      .populate('locationId', 'name city state')
      .populate('managerId', 'firstName lastName employeeCode');

    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    await recordAuditLog({
      action: 'EMPLOYEE_UPDATED',
      actorId: changedByUserId,
      targetId: id,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    return employee;
  }

  /**
   * Performs an effective-dated lifecycle transition (transfer, promotion, manager change)
   * Updates current employee record and logs a permanent history snapshot
   */
  async transferEmployee(id, transferData, changedByUserId = null) {
    const employee = await Employee.findById(id);
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    const {
      changeType = 'TRANSFER',
      effectiveDate = new Date(),
      departmentId,
      designationId,
      locationId,
      managerId,
      status,
      notes = '',
    } = transferData;

    // Apply updates to employee document
    if (departmentId !== undefined) employee.departmentId = departmentId;
    if (designationId !== undefined) employee.designationId = designationId;
    if (locationId !== undefined) employee.locationId = locationId;
    if (managerId !== undefined) employee.managerId = managerId;
    if (status !== undefined) employee.status = status;

    await employee.save();

    // Record immutable audit history
    const history = await EmployeeJobHistory.create({
      employeeId: employee._id,
      organizationId: employee.organizationId,
      changeType,
      effectiveDate,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      locationId: employee.locationId,
      managerId: employee.managerId,
      status: employee.status,
      notes,
      changedBy: changedByUserId,
    });

    await recordAuditLog({
      action: `EMPLOYEE_LIFECYCLE_${changeType}`,
      actorId: changedByUserId,
      targetId: id,
      metadata: { changeType, effectiveDate, notes },
    });

    const updatedEmployee = await this.getEmployeeById(id);

    return {
      employee: updatedEmployee,
      history,
    };
  }

  /**
   * Retrieves full chronological job and lifecycle history for an employee
   */
  async getEmployeeJobHistory(employeeId) {
    return await EmployeeJobHistory.find({ employeeId })
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code level')
      .populate('locationId', 'name city state')
      .populate('managerId', 'firstName lastName employeeCode')
      .populate('changedBy', 'firstName lastName email')
      .sort({ effectiveDate: -1, recordedAt: -1 });
  }

  /**
   * Generates a fresh activation token and resends welcome invitation email
   */
  async resendEmployeeInvitation(orgId, employeeId, actorUserId) {
    const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId });
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    let user = await User.findOne({ email: employee.workEmail });
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const tempPassword = `Welcome@${new Date().getFullYear()}`;

    if (!user) {
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      user = await User.create({
        organizationId: orgId,
        employeeId: employee._id,
        email: employee.workEmail,
        firstName: employee.firstName,
        lastName: employee.lastName,
        passwordHash,
        roles: [ROLES.EMPLOYEE],
        status: 'ACTIVE',
        resetPasswordToken: tokenHash,
        resetPasswordExpiresAt: tokenExpiresAt,
      });
      employee.userId = user._id;
      await employee.save();
    } else {
      user.resetPasswordToken = tokenHash;
      user.resetPasswordExpiresAt = tokenExpiresAt;
      if (!user.employeeId) user.employeeId = employee._id;
      await user.save();
    }

    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      purpose: 'INVITE',
      expiresAt: tokenExpiresAt,
    });

    const resetUrl = `${ENV.CLIENT_URL}/reset-password?token=${rawToken}`;
    const dept = employee.departmentId ? await Department.findById(employee.departmentId) : null;
    const org = await Organization.findById(orgId);

    await emailService.sendWelcomeAndInvitationEmail({
      toEmail: employee.workEmail,
      name: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      departmentName: dept?.name || 'General',
      resetUrl,
      tempPassword,
      organizationName: org?.name || 'PeopleCore Technologies Ltd.',
    });

    await recordAuditLog({
      action: 'EMPLOYEE_INVITATION_RESENT',
      actorId: actorUserId,
      targetId: employeeId.toString(),
      metadata: { workEmail: employee.workEmail, resetUrl },
    });

    return {
      success: true,
      email: employee.workEmail,
      activationUrl: resetUrl,
      tempPassword,
      message: `Welcome invitation successfully sent to ${employee.workEmail}`,
    };
  }

  /**
   * 360-Degree Holistic Employee Intelligence Hub
   * Aggregates employment status, live leave balances, monthly attendance,
   * salary structure & past credited payslips, assets custody, OKRs, documents, and history.
   */
  async getEmployee360Profile(employeeId, orgId) {
    const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId })
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code level')
      .populate('locationId', 'name city state')
      .populate('managerId', 'firstName lastName employeeCode workEmail')
      .populate('userId', 'email roles status lastLoginAt');

    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    const currentYear = new Date().getFullYear();

    // 1. Leave & Quotas Breakdown
    const leaveTypes = await LeaveType.find({ organizationId: orgId, isActive: true });
    const leaveBalances = await Promise.all(
      leaveTypes.map(async (lt) => {
        const lastLedger = await LeaveLedger.findOne({
          employeeId: employee._id,
          leaveTypeId: lt._id,
          year: currentYear,
        }).sort({ createdAt: -1 });

        return {
          leaveTypeId: lt._id,
          name: lt.name,
          code: lt.code,
          category: lt.category,
          annualQuota: lt.annualQuota,
          isPaid: lt.isPaid,
          balance: lastLedger ? lastLedger.balanceAfter : 0,
        };
      })
    );

    const recentLeaves = await LeaveRequest.find({ employeeId: employee._id })
      .populate('leaveTypeId', 'name code category')
      .sort({ createdAt: -1 })
      .limit(6);

    // 2. Attendance Metrics for Current Month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyAttendanceDays = await AttendanceDay.find({
      employeeId: employee._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });

    const attendanceStats = {
      present: monthlyAttendanceDays.filter((d) => d.status === 'PRESENT').length,
      absent: monthlyAttendanceDays.filter((d) => d.status === 'ABSENT').length,
      halfDay: monthlyAttendanceDays.filter((d) => d.status === 'HALF_DAY').length,
      holiday: monthlyAttendanceDays.filter((d) => d.status === 'HOLIDAY').length,
      onLeave: monthlyAttendanceDays.filter((d) => d.status === 'ON_LEAVE').length,
      totalTracked: monthlyAttendanceDays.length,
    };

    const defaultShift = await Shift.findOne({ organizationId: orgId, isDefault: true, isActive: true });

    // 3. Payroll & Compensation Status (answers: "is past month salary credited")
    const compensation = await EmployeeSalary.findOne({ employeeId: employee._id, isActive: true })
      .populate('salaryStructureId', 'name code');

    const payslips = await Payslip.find({ employeeId: employee._id })
      .sort({ 'period.year': -1, 'period.month': -1 })
      .limit(12);

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthYear = prevMonthDate.getFullYear();
    const prevMonthNum = prevMonthDate.getMonth() + 1;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const prevMonthName = `${monthNames[prevMonthNum - 1]} ${prevMonthYear}`;

    // Specifically determine if previous calendar month was credited & published
    const pastMonthPayslip = payslips.find(
      (p) => p.period?.year === prevMonthYear && p.period?.month === prevMonthNum && p.status === 'PUBLISHED'
    );

    // 4. Company Assets Custody
    const assets = await Asset.find({ employeeId: employee._id });

    // 5. Goals & OKRs
    const goals = await Goal.find({ employeeId: employee._id }).sort({ createdAt: -1 });

    // 6. Chronological Job History
    const jobHistory = await EmployeeJobHistory.find({ employeeId: employee._id })
      .populate('departmentId', 'name')
      .populate('designationId', 'title')
      .populate('changedBy', 'firstName lastName email')
      .sort({ effectiveDate: -1, recordedAt: -1 });

    return {
      employee,
      leave: {
        currentYear,
        balances: leaveBalances,
        recentRequests: recentLeaves,
      },
      attendance: {
        stats: attendanceStats,
        assignedShift: defaultShift || { name: 'General Shift', startTime: '09:00', endTime: '18:00' },
        recentDays: monthlyAttendanceDays.slice(0, 10),
      },
      payroll: {
        compensation,
        payslips,
        latestPayslip: payslips[0] || null,
        pastMonthName: prevMonthName,
        pastMonthPayslip: pastMonthPayslip || null,
        isPastMonthCredited: !!pastMonthPayslip,
      },
      assets,
      goals,
      documents: employee.documents || [],
      jobHistory,
    };
  }

  /**
   * Admin applies and directly approves leave on behalf of an employee (e.g. employee called or emailed HR)
   */
  async recordAdminLeave(orgId, employeeId, leaveData, actorUserId) {
    const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId });
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    const { leaveTypeId, startDate, endDate, isHalfDay, reason, autoApprove = true } = leaveData;

    // Apply leave request using leaveService to ensure ledger consistency and holiday exclusion
    const leaveReq = await leaveService.applyLeave(orgId, employee._id, {
      leaveTypeId,
      startDate,
      endDate,
      isHalfDay: !!isHalfDay,
      reason: reason || 'Recorded manually by HR Admin on employee request',
    });

    let approvedReq = leaveReq;
    if (autoApprove) {
      approvedReq = await leaveService.approveLeave(
        leaveReq._id,
        actorUserId,
        'Approved by HR Admin via Per-Employee Management'
      );
    }

    await recordAuditLog({
      action: 'ADMIN_RECORDED_LEAVE',
      actorId: actorUserId,
      targetId: employeeId.toString(),
      metadata: {
        leaveRequestId: leaveReq._id,
        leaveTypeId,
        startDate,
        endDate,
        autoApprove,
        reason,
      },
    });

    return approvedReq;
  }

  /**
   * Uploads and registers a verified or pending document to an employee profile
   */
  async addEmployeeDocument(orgId, employeeId, docData, actorUserId) {
    const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId });
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    let fileName = docData.fileName || docData.title || 'Document';
    let fileUrl = docData.fileUrl || '';
    let fileSize = docData.fileSize || 'Standard';

    if (docData.file) {
      fileName = docData.file.originalname;
      fileUrl = `/uploads/documents/${docData.file.filename}`;
      const sizeKb = Math.round(docData.file.size / 1024);
      fileSize = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    }

    const newDoc = {
      docType: docData.docType || 'OTHER',
      title: docData.title || fileName,
      fileName,
      fileUrl,
      fileSize,
      status: docData.status || 'VERIFIED',
      notes: docData.notes || '',
      uploadedAt: new Date(),
      uploadedBy: actorUserId,
    };

    employee.documents.push(newDoc);
    await employee.save();

    await recordAuditLog({
      action: 'EMPLOYEE_DOCUMENT_UPLOADED',
      actorId: actorUserId,
      targetId: employeeId.toString(),
      metadata: { docType: newDoc.docType, title: newDoc.title, fileName: newDoc.fileName },
    });

    return employee.documents[employee.documents.length - 1];
  }

  /**
   * Deletes a document from an employee record
   */
  async deleteEmployeeDocument(orgId, employeeId, docId, actorUserId) {
    const employee = await Employee.findOne({ _id: employeeId, organizationId: orgId });
    if (!employee) {
      throw { statusCode: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' };
    }

    employee.documents = employee.documents.filter((d) => d._id.toString() !== docId.toString());
    await employee.save();

    await recordAuditLog({
      action: 'EMPLOYEE_DOCUMENT_DELETED',
      actorId: actorUserId,
      targetId: employeeId.toString(),
      metadata: { docId },
    });

    return { success: true, message: 'Document removed successfully' };
  }
}

export const employeeService = new EmployeeService();
