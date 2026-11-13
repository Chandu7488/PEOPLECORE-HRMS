import mongoose from 'mongoose';
import { SalaryStructure } from './salaryStructure.model.js';
import { EmployeeSalary } from './employeeSalary.model.js';
import { PayrollRun } from './payrollRun.model.js';
import { Payslip } from './payslip.model.js';
import { Employee } from '../employees/employee.model.js';
import { Department } from '../organization/department.model.js';
import { Designation } from '../organization/designation.model.js';
import { LeaveRequest } from '../leave/leaveRequest.model.js';
import { AttendanceDay } from '../attendance/attendanceDay.model.js';
import { User } from '../users/user.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

/**
 * Utility: Round number to 2 decimal places with banker's / epsilon rounding for money safety
 * @param {number} num
 * @returns {number}
 */
export const roundCurrency = (num) => {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
};

/**
 * Converts numbers into Indian Rupee words format (e.g. 52400 -> Rupees Fifty-Two Thousand Four Hundred Only)
 * @param {number} amount
 * @returns {string}
 */
export const numberToIndianWords = (amount) => {
  const rounded = Math.floor(amount);
  if (rounded === 0) return 'Rupees Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n) => {
    if (n === 0) return '';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unitPart = units[n % 10];
    return tens[Math.floor(n / 10)] + (unitPart ? '-' + unitPart : '');
  };

  const convertThreeDigits = (n) => {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += units[hundred] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  };

  let num = rounded;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remainder = num;

  if (crore > 0) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (remainder > 0) words += convertThreeDigits(remainder) + ' ';

  return `Rupees ${words.trim()} Only`;
};

/**
 * Payroll Service
 * Handles Section 4.8 & Section 11 of PeopleCore Master Project Documentation:
 * Salary Structures, Employee Assignment, Attendance & LWP Integration,
 * Versioned Deterministic Calculations, Maker-Checker Review & Approval, Locking & Payslip Publishing
 */
export class PayrollService {
  /**
   * Initializes default corporate salary structure if none exists
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<object>}
   */
  async seedDefaultSalaryStructure(orgId) {
    let structure = await SalaryStructure.findOne({ organizationId: orgId, code: 'TECH_STD' });
    if (!structure) {
      structure = await SalaryStructure.create({
        organizationId: orgId,
        name: 'Standard Technical & Engineering Grade',
        code: 'TECH_STD',
        description: 'Standard India payroll structure with Basic, HRA, Special Allowance, PF, and Professional Tax',
        components: [
          {
            code: 'BASIC',
            name: 'Basic Salary',
            type: 'EARNING',
            calculationType: 'PERCENTAGE_OF_CTC',
            value: 50,
            isTaxable: true,
            description: 'Core basic pay component (50% of CTC)',
          },
          {
            code: 'HRA',
            name: 'House Rent Allowance',
            type: 'EARNING',
            calculationType: 'PERCENTAGE_OF_BASIC',
            value: 50,
            isTaxable: true,
            description: 'House rent allowance (50% of Basic)',
          },
          {
            code: 'SPECIAL_ALLOWANCE',
            name: 'Special Allowance',
            type: 'EARNING',
            calculationType: 'FIXED',
            value: 0, // Balancing component
            isTaxable: true,
            description: 'Residual flexible allowance',
          },
          {
            code: 'PF_EMPLOYEE',
            name: 'Provident Fund (Employee)',
            type: 'DEDUCTION',
            calculationType: 'PERCENTAGE_OF_BASIC',
            value: 12,
            isTaxable: false,
            description: 'Statutory 12% deduction from Basic wages',
          },
          {
            code: 'PROF_TAX',
            name: 'Professional Tax (PT)',
            type: 'DEDUCTION',
            calculationType: 'SLAB',
            value: 200,
            isTaxable: false,
            description: 'State professional tax standard slab',
          },
          {
            code: 'PF_EMPLOYER',
            name: 'Provident Fund (Employer Share)',
            type: 'EMPLOYER_CONTRIBUTION',
            calculationType: 'PERCENTAGE_OF_BASIC',
            value: 12,
            isTaxable: false,
            description: 'Statutory employer 12% matching contribution',
          },
        ],
      });
    }
    return structure;
  }

  /**
   * Retrieves or auto-allocates compensation for an employee
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {number} [defaultAnnualCtc=600000]
   * @returns {Promise<object>}
   */
  async getOrCreateEmployeeSalary(employeeId, orgId, defaultAnnualCtc = 600000) {
    let salary = await EmployeeSalary.findOne({
      organizationId: orgId,
      employeeId,
      status: 'ACTIVE',
    });

    if (salary) return salary;

    const structure = await this.seedDefaultSalaryStructure(orgId);
    const monthlyGross = roundCurrency(defaultAnnualCtc / 12);

    // Standard formula: Basic = 50% of Gross, HRA = 25% of Gross (50% of Basic), Special Allowance = 25% of Gross
    const basicMonthly = roundCurrency(monthlyGross * 0.5);
    const hraMonthly = roundCurrency(basicMonthly * 0.5);
    const specialMonthly = roundCurrency(monthlyGross - (basicMonthly + hraMonthly));

    const components = [
      {
        code: 'BASIC',
        name: 'Basic Salary',
        type: 'EARNING',
        monthlyAmount: basicMonthly,
        annualAmount: roundCurrency(basicMonthly * 12),
        isTaxable: true,
      },
      {
        code: 'HRA',
        name: 'House Rent Allowance',
        type: 'EARNING',
        monthlyAmount: hraMonthly,
        annualAmount: roundCurrency(hraMonthly * 12),
        isTaxable: true,
      },
      {
        code: 'SPECIAL_ALLOWANCE',
        name: 'Special Allowance',
        type: 'EARNING',
        monthlyAmount: specialMonthly,
        annualAmount: roundCurrency(specialMonthly * 12),
        isTaxable: true,
      },
      {
        code: 'PF_EMPLOYEE',
        name: 'Provident Fund (Employee)',
        type: 'DEDUCTION',
        monthlyAmount: roundCurrency(basicMonthly * 0.12),
        annualAmount: roundCurrency(basicMonthly * 0.12 * 12),
        isTaxable: false,
      },
      {
        code: 'PROF_TAX',
        name: 'Professional Tax',
        type: 'DEDUCTION',
        monthlyAmount: monthlyGross > 15000 ? 200 : 0,
        annualAmount: monthlyGross > 15000 ? 2400 : 0,
        isTaxable: false,
      },
      {
        code: 'PF_EMPLOYER',
        name: 'Provident Fund (Employer Contribution)',
        type: 'EMPLOYER_CONTRIBUTION',
        monthlyAmount: roundCurrency(basicMonthly * 0.12),
        annualAmount: roundCurrency(basicMonthly * 0.12 * 12),
        isTaxable: false,
      },
    ];

    salary = await EmployeeSalary.create({
      organizationId: orgId,
      employeeId,
      salaryStructureId: structure._id,
      annualCtc: defaultAnnualCtc,
      monthlyGross,
      currency: 'INR',
      effectiveFrom: new Date(),
      components,
      status: 'ACTIVE',
    });

    return salary;
  }

  /**
   * Updates or assigns custom salary for an employee
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {object} data
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<object>}
   */
  async assignEmployeeSalary(employeeId, data, orgId, userId) {
    const { annualCtc, paymentDetails, reason } = data;
    const monthlyGross = roundCurrency(annualCtc / 12);

    const basicMonthly = roundCurrency(monthlyGross * 0.5);
    const hraMonthly = roundCurrency(basicMonthly * 0.5);
    const specialMonthly = roundCurrency(monthlyGross - (basicMonthly + hraMonthly));

    const components = [
      {
        code: 'BASIC',
        name: 'Basic Salary',
        type: 'EARNING',
        monthlyAmount: basicMonthly,
        annualAmount: roundCurrency(basicMonthly * 12),
        isTaxable: true,
      },
      {
        code: 'HRA',
        name: 'House Rent Allowance',
        type: 'EARNING',
        monthlyAmount: hraMonthly,
        annualAmount: roundCurrency(hraMonthly * 12),
        isTaxable: true,
      },
      {
        code: 'SPECIAL_ALLOWANCE',
        name: 'Special Allowance',
        type: 'EARNING',
        monthlyAmount: specialMonthly,
        annualAmount: roundCurrency(specialMonthly * 12),
        isTaxable: true,
      },
      {
        code: 'PF_EMPLOYEE',
        name: 'Provident Fund (Employee)',
        type: 'DEDUCTION',
        monthlyAmount: roundCurrency(basicMonthly * 0.12),
        annualAmount: roundCurrency(basicMonthly * 0.12 * 12),
        isTaxable: false,
      },
      {
        code: 'PROF_TAX',
        name: 'Professional Tax',
        type: 'DEDUCTION',
        monthlyAmount: monthlyGross > 15000 ? 200 : 0,
        annualAmount: monthlyGross > 15000 ? 2400 : 0,
        isTaxable: false,
      },
      {
        code: 'PF_EMPLOYER',
        name: 'Provident Fund (Employer Contribution)',
        type: 'EMPLOYER_CONTRIBUTION',
        monthlyAmount: roundCurrency(basicMonthly * 0.12),
        annualAmount: roundCurrency(basicMonthly * 0.12 * 12),
        isTaxable: false,
      },
    ];

    let existing = await EmployeeSalary.findOne({ organizationId: orgId, employeeId, status: 'ACTIVE' });
    if (existing) {
      existing.status = 'SUPERSEDED';
      await existing.save();
    }

    const newSalary = await EmployeeSalary.create({
      organizationId: orgId,
      employeeId,
      annualCtc,
      monthlyGross,
      currency: 'INR',
      effectiveFrom: new Date(),
      components,
      paymentDetails: paymentDetails || (existing ? existing.paymentDetails : undefined),
      status: 'ACTIVE',
      revisions: existing
        ? [
            ...existing.revisions,
            {
              revisedAt: new Date(),
              revisedBy: userId,
              previousCtc: existing.annualCtc,
              newCtc: annualCtc,
              reason: reason || 'Salary revision / increment',
            },
          ]
        : [],
    });

    return newSalary;
  }

  /**
   * Creates a new monthly payroll run
   * @param {object} params
   * @returns {Promise<object>}
   */
  async createPayrollRun({ orgId, year, month, payoutDate, userId, notes }) {
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const existing = await PayrollRun.findOne({ organizationId: orgId, period });
    if (existing) {
      const error = new Error(`Payroll run for period ${period} already exists with status ${existing.status}`);
      error.statusCode = 409;
      error.code = 'PAYROLL_RUN_DUPLICATE';
      throw error;
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const actualPayoutDate = payoutDate ? new Date(payoutDate) : new Date(Date.UTC(year, month, 1));

    const run = await PayrollRun.create({
      organizationId: orgId,
      year,
      month,
      period,
      startDate,
      endDate,
      payoutDate: actualPayoutDate,
      status: 'DRAFT',
      preparedBy: userId,
      preparedAt: new Date(),
      notes,
    });

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'PAYROLL_RUN_CREATED',
      entity: 'PayrollRun',
      entityId: run._id,
      metadata: { period, year, month },
    });

    return run;
  }

  /**
   * Deterministic payroll calculation engine
   * Integrates attendance inputs, unpaid leave (LWP), earnings proration, and statutory deductions
   * @param {string|mongoose.Types.ObjectId} payrollRunId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<object>}
   */
  async calculatePayrollRun(payrollRunId, orgId, userId) {
    const run = await PayrollRun.findOne({ _id: payrollRunId, organizationId: orgId });
    if (!run) {
      const err = new Error('Payroll run not found');
      err.statusCode = 404;
      throw err;
    }

    if (run.status === 'LOCKED' || run.status === 'PAID') {
      const err = new Error(`Cannot recalculate a locked or paid payroll run (${run.status})`);
      err.statusCode = 400;
      throw err;
    }

    // Fetch all active employees
    const employees = await Employee.find({
      organizationId: orgId,
      status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] },
    }).populate('departmentId designationId');

    const totalDays = new Date(run.year, run.month, 0).getDate();
    const periodMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const periodString = `${periodMonths[run.month - 1]} ${run.year}`;

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let totalEmployerContributions = 0;

    // Remove any previous draft payslips for this run
    await Payslip.deleteMany({ payrollRunId: run._id });

    for (const emp of employees) {
      // 1. Get salary definition
      const salary = await this.getOrCreateEmployeeSalary(emp._id, orgId);

      // 2. Fetch approved unpaid leaves (LWP) within the run window
      const unpaidLeaves = await LeaveRequest.find({
        employeeId: emp._id,
        status: 'APPROVED',
        startDate: { $lte: run.endDate },
        endDate: { $gte: run.startDate },
      }).populate('leaveTypeId');

      let lwpDays = 0;
      for (const leave of unpaidLeaves) {
        if (!leave.leaveTypeId?.isPaid || leave.leaveTypeId?.code === 'LWP') {
          lwpDays += leave.totalDays;
        }
      }

      // 3. Fetch attendance days recorded
      const attendanceDays = await AttendanceDay.find({
        employeeId: emp._id,
        date: { $gte: run.startDate, $lte: run.endDate },
      });

      let presentDays = 0;
      let paidLeaveDays = 0;
      let holidays = 0;
      let weeklyOffs = 0;

      for (const day of attendanceDays) {
        if (day.status === 'PRESENT' || day.status === 'HALF_DAY') presentDays += (day.status === 'HALF_DAY' ? 0.5 : 1);
        else if (day.status === 'LEAVE') paidLeaveDays += 1;
        else if (day.status === 'HOLIDAY') holidays += 1;
        else if (day.status === 'WEEKLY_OFF') weeklyOffs += 1;
      }

      // Payable Days = Total Calendar Days minus Unpaid Loss of Pay Days
      const payableDays = Math.max(0, totalDays - lwpDays);
      const prorationFactor = totalDays > 0 ? payableDays / totalDays : 1;

      // 4. Calculate Earnings Prorated
      const calculatedEarnings = [];
      let empGross = 0;

      for (const comp of salary.components) {
        if (comp.type === 'EARNING') {
          const earned = roundCurrency(comp.monthlyAmount * prorationFactor);
          calculatedEarnings.push({
            code: comp.code,
            name: comp.name,
            baseAmount: comp.monthlyAmount,
            earnedAmount: earned,
            isTaxable: comp.isTaxable,
          });
          empGross += earned;
        }
      }
      empGross = roundCurrency(empGross);

      // Find earned basic for statutory deductions
      const earnedBasic = calculatedEarnings.find((c) => c.code === 'BASIC')?.earnedAmount || 0;

      // 5. Calculate Deductions (Statutory PF 12%, Professional Tax, TDS)
      const calculatedDeductions = [];
      let empDeductions = 0;

      // PF Employee Share (12% of earned basic)
      const pfAmount = roundCurrency(earnedBasic * 0.12);
      calculatedDeductions.push({
        code: 'PF_EMPLOYEE',
        name: 'Provident Fund (Employee)',
        amount: pfAmount,
      });
      empDeductions += pfAmount;

      // Professional Tax (PT standard ₹200 if gross > 15,000)
      const ptAmount = empGross > 15000 ? 200 : 0;
      if (ptAmount > 0) {
        calculatedDeductions.push({
          code: 'PROF_TAX',
          name: 'Professional Tax',
          amount: ptAmount,
        });
        empDeductions += ptAmount;
      }

      empDeductions = roundCurrency(empDeductions);

      // 6. Employer Contributions (PF Employer 12%)
      const calculatedContributions = [];
      let empContributions = 0;
      const pfEmployerAmount = roundCurrency(earnedBasic * 0.12);
      calculatedContributions.push({
        code: 'PF_EMPLOYER',
        name: 'Provident Fund (Employer Share)',
        amount: pfEmployerAmount,
      });
      empContributions += pfEmployerAmount;

      // 7. Net Pay
      const netPay = roundCurrency(empGross - empDeductions);
      const netPayInWords = numberToIndianWords(netPay);

      // 8. Create Payslip
      await Payslip.create({
        organizationId: orgId,
        payrollRunId: run._id,
        employeeId: emp._id,
        employeeSnapshot: {
          employeeCode: emp.employeeCode,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.workEmail,
          department: emp.departmentId?.name || 'General',
          designation: emp.designationId?.title || 'Team Member',
          dateOfJoining: emp.dateOfJoining,
          bankName: salary.paymentDetails?.bankName || 'HDFC Bank',
          accountNumber: salary.paymentDetails?.accountNumber || '50100458921456',
          ifscCode: salary.paymentDetails?.ifscCode || 'HDFC0000123',
          pan: salary.paymentDetails?.pan || 'ABCDE1234F',
          pfUan: salary.paymentDetails?.pfUan || '101234567890',
        },
        period: {
          year: run.year,
          month: run.month,
          periodString,
          startDate: run.startDate,
          endDate: run.endDate,
          payoutDate: run.payoutDate,
        },
        attendanceSnapshot: {
          totalDays,
          workingDays: totalDays - (holidays + weeklyOffs),
          presentDays,
          paidLeaveDays,
          holidays,
          weeklyOffs,
          unpaidLeaveDays: lwpDays,
          payableDays,
        },
        earnings: calculatedEarnings,
        deductions: calculatedDeductions,
        employerContributions: calculatedContributions,
        grossEarnings: empGross,
        totalDeductions: empDeductions,
        netPay,
        netPayInWords,
        status: 'DRAFT',
      });

      totalGrossPay += empGross;
      totalDeductions += empDeductions;
      totalNetPay += netPay;
      totalEmployerContributions += empContributions;
    }

    run.status = 'CALCULATED';
    run.totals = {
      totalEmployees: employees.length,
      totalGrossPay: roundCurrency(totalGrossPay),
      totalDeductions: roundCurrency(totalDeductions),
      totalNetPay: roundCurrency(totalNetPay),
      totalEmployerContributions: roundCurrency(totalEmployerContributions),
    };
    await run.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'PAYROLL_RUN_CALCULATED',
      entity: 'PayrollRun',
      entityId: run._id,
      metadata: { period: run.period, totals: run.totals },
    });

    return run;
  }

  /**
   * Submits calculated payroll for maker-checker review
   * @param {string|mongoose.Types.ObjectId} payrollRunId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<object>}
   */
  async submitPayrollRunForReview(payrollRunId, orgId, userId) {
    const run = await PayrollRun.findOne({ _id: payrollRunId, organizationId: orgId });
    if (!run) {
      const err = new Error('Payroll run not found');
      err.statusCode = 404;
      throw err;
    }

    if (run.status !== 'CALCULATED') {
      const err = new Error(`Only CALCULATED runs can be submitted for review (Current: ${run.status})`);
      err.statusCode = 400;
      throw err;
    }

    run.status = 'REVIEW';
    run.reviewedBy = userId;
    run.reviewedAt = new Date();
    await run.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'PAYROLL_RUN_SUBMITTED_FOR_REVIEW',
      entity: 'PayrollRun',
      entityId: run._id,
    });

    return run;
  }

  /**
   * Approves a payroll run with maker-checker separation of duties
   * @param {string|mongoose.Types.ObjectId} payrollRunId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {boolean} [bypassMakerChecker=false]
   * @returns {Promise<object>}
   */
  async approvePayrollRun(payrollRunId, orgId, userId, bypassMakerChecker = false) {
    const run = await PayrollRun.findOne({ _id: payrollRunId, organizationId: orgId });
    if (!run) {
      const err = new Error('Payroll run not found');
      err.statusCode = 404;
      throw err;
    }

    if (run.status !== 'REVIEW' && run.status !== 'CALCULATED') {
      const err = new Error(`Run cannot be approved from status: ${run.status}`);
      err.statusCode = 400;
      throw err;
    }

    // Maker-checker policy enforcement (Section 237)
    // Check if there are other admin/super-admin users in the org
    if (!bypassMakerChecker && run.preparedBy.toString() === userId.toString()) {
      const otherAdmins = await User.countDocuments({
        organizationId: orgId,
        _id: { $ne: userId },
        roles: { $in: ['SUPER_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN'] },
        status: 'ACTIVE',
      });

      if (otherAdmins > 0) {
        const err = new Error('Maker-Checker Constraint: Preparer cannot approve their own payroll run. An independent reviewer must approve.');
        err.statusCode = 403;
        err.code = 'MAKER_CHECKER_VIOLATION';
        throw err;
      }
    }

    run.status = 'APPROVED';
    run.approvedBy = userId;
    run.approvedAt = new Date();
    await run.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'PAYROLL_RUN_APPROVED',
      entity: 'PayrollRun',
      entityId: run._id,
    });

    return run;
  }

  /**
   * Locks payroll run and publishes payslips
   * Once locked, the run and payslips are immutable per Section 4.8
   * @param {string|mongoose.Types.ObjectId} payrollRunId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @returns {Promise<object>}
   */
  async lockPayrollRun(payrollRunId, orgId, userId) {
    const run = await PayrollRun.findOne({ _id: payrollRunId, organizationId: orgId });
    if (!run) {
      const err = new Error('Payroll run not found');
      err.statusCode = 404;
      throw err;
    }

    if (run.status !== 'APPROVED') {
      const err = new Error(`Only APPROVED runs can be locked and published (Current: ${run.status})`);
      err.statusCode = 400;
      throw err;
    }

    run.status = 'LOCKED';
    run.lockedBy = userId;
    run.lockedAt = new Date();
    run.publishedPayslips = true;
    await run.save();

    // Mark all payslips as PUBLISHED
    await Payslip.updateMany({ payrollRunId: run._id }, { status: 'PUBLISHED' });

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'PAYROLL_RUN_LOCKED_AND_PUBLISHED',
      entity: 'PayrollRun',
      entityId: run._id,
      metadata: { period: run.period },
    });

    return run;
  }

  /**
   * Lists all payroll runs for organization
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<Array<object>>}
   */
  async getPayrollRuns(orgId) {
    return PayrollRun.find({ organizationId: orgId })
      .populate('preparedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('lockedBy', 'firstName lastName email')
      .sort({ year: -1, month: -1 });
  }

  /**
   * Gets single payroll run details with payslip list
   * @param {string|mongoose.Types.ObjectId} payrollRunId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<object>}
   */
  async getPayrollRunById(payrollRunId, orgId) {
    const run = await PayrollRun.findOne({ _id: payrollRunId, organizationId: orgId })
      .populate('preparedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email');
    if (!run) {
      const err = new Error('Payroll run not found');
      err.statusCode = 404;
      throw err;
    }

    const payslips = await Payslip.find({ payrollRunId: run._id }).sort({ 'employeeSnapshot.employeeCode': 1 });
    return { run, payslips };
  }

  /**
   * Employee self-service: Lists published payslips for an employee
   * @param {string|mongoose.Types.ObjectId} employeeId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<Array<object>>}
   */
  async getEmployeePayslips(employeeId, orgId) {
    return Payslip.find({
      organizationId: orgId,
      employeeId,
      status: 'PUBLISHED',
    }).sort({ 'period.year': -1, 'period.month': -1 });
  }

  /**
   * Retrieves single detailed payslip
   * @param {string|mongoose.Types.ObjectId} payslipId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {object} requesterUser
   * @returns {Promise<object>}
   */
  async getPayslipById(payslipId, orgId, requesterUser) {
    const payslip = await Payslip.findOne({ _id: payslipId, organizationId: orgId });
    if (!payslip) {
      const err = new Error('Payslip not found');
      err.statusCode = 404;
      throw err;
    }

    const isHrOrAdmin = requesterUser.roles?.some((r) =>
      ['SUPER_ADMIN', 'HR_ADMIN', 'PAYROLL_ADMIN'].includes(r)
    );

    // If regular employee, verify they are only viewing their own published payslip
    if (!isHrOrAdmin) {
      const employee = await Employee.findOne({ userId: requesterUser.id });
      if (!employee || payslip.employeeId.toString() !== employee._id.toString()) {
        const err = new Error('Access denied: You can only view your own payslips');
        err.statusCode = 403;
        throw err;
      }
      if (payslip.status !== 'PUBLISHED') {
        const err = new Error('This payslip has not been published yet');
        err.statusCode = 400;
        throw err;
      }
    }

    return payslip;
  }

  /**
   * Generates CSV string for Bank Advice and Payroll Register Export
   * @param {string|mongoose.Types.ObjectId} payrollRunId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<string>}
   */
  async exportPayrollRegisterCsv(payrollRunId, orgId) {
    const { run, payslips } = await this.getPayrollRunById(payrollRunId, orgId);

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Designation',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'PAN',
      'Total Days',
      'Payable Days',
      'LWP Days',
      'Earned Basic',
      'Earned HRA',
      'Earned Special Allowance',
      'Gross Earnings (INR)',
      'Employee PF (INR)',
      'Professional Tax (INR)',
      'Total Deductions (INR)',
      'Net Pay (INR)',
    ];

    const rows = payslips.map((p) => {
      const basic = p.earnings.find((e) => e.code === 'BASIC')?.earnedAmount || 0;
      const hra = p.earnings.find((e) => e.code === 'HRA')?.earnedAmount || 0;
      const special = p.earnings.find((e) => e.code === 'SPECIAL_ALLOWANCE')?.earnedAmount || 0;
      const pf = p.deductions.find((d) => d.code === 'PF_EMPLOYEE')?.amount || 0;
      const pt = p.deductions.find((d) => d.code === 'PROF_TAX')?.amount || 0;

      return [
        `"${p.employeeSnapshot.employeeCode}"`,
        `"${p.employeeSnapshot.name}"`,
        `"${p.employeeSnapshot.department}"`,
        `"${p.employeeSnapshot.designation}"`,
        `"${p.employeeSnapshot.bankName || ''}"`,
        `"${p.employeeSnapshot.accountNumber || ''}"`,
        `"${p.employeeSnapshot.ifscCode || ''}"`,
        `"${p.employeeSnapshot.pan || ''}"`,
        p.attendanceSnapshot.totalDays,
        p.attendanceSnapshot.payableDays,
        p.attendanceSnapshot.unpaidLeaveDays,
        basic,
        hra,
        special,
        p.grossEarnings,
        pf,
        pt,
        p.totalDeductions,
        p.netPay,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

export const payrollService = new PayrollService();
