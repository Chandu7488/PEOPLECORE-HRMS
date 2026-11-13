import { JobRequisition } from './jobRequisition.model.js';
import { Candidate } from './candidate.model.js';
import { Department } from '../organization/department.model.js';
import { Designation } from '../organization/designation.model.js';
import { Location } from '../organization/location.model.js';
import { Employee } from '../employees/employee.model.js';
import { EmployeeService } from '../employees/employee.service.js';
import { leaveService } from '../leave/leave.service.js';
import { recordAuditLog } from '../audit/audit.model.js';

const employeeService = new EmployeeService();

/**
 * Recruitment & ATS Service
 * Implements Job Requisitions, Candidate Tracking Pipeline, and 1-Click Employee Onboarding
 */
export class RecruitmentService {
  /**
   * Generates next unique requisition code (e.g. REQ-2026-001)
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<string>} Next requisition code
   */
  async generateNextRequisitionCode(orgId) {
    const currentYear = new Date().getFullYear();
    const prefix = `REQ-${currentYear}-`;
    const latest = await JobRequisition.findOne({
      organizationId: orgId,
      requisitionCode: new RegExp(`^${prefix}`),
    }).sort({ requisitionCode: -1 });

    let nextNumber = 1;
    if (latest && latest.requisitionCode) {
      const match = latest.requisitionCode.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

  /**
   * Creates a new job requisition
   * @param {string} orgId
   * @param {object} data
   * @param {string} userId
   * @returns {Promise<JobRequisition>}
   */
  async createRequisition(orgId, data, userId) {
    let requisitionCode = data.requisitionCode?.trim().toUpperCase();
    if (!requisitionCode) {
      requisitionCode = await this.generateNextRequisitionCode(orgId);
    }

    const requisition = await JobRequisition.create({
      organizationId: orgId,
      requisitionCode,
      title: data.title,
      departmentId: data.departmentId,
      designationId: data.designationId || null,
      locationId: data.locationId || null,
      employmentType: data.employmentType || 'FULL_TIME',
      openingsCount: Number(data.openingsCount) || 1,
      filledCount: 0,
      experienceMin: Number(data.experienceMin) || 0,
      experienceMax: Number(data.experienceMax) || 5,
      budgetMin: Number(data.budgetMin) || 0,
      budgetMax: Number(data.budgetMax) || 0,
      hiringManagerId: data.hiringManagerId || null,
      status: data.status || 'OPEN',
      priority: data.priority || 'MEDIUM',
      targetDate: data.targetDate || null,
      jobDescription: data.jobDescription || '',
      skills: Array.isArray(data.skills) ? data.skills : (data.skills ? data.skills.split(',').map((s) => s.trim()) : []),
      createdBy: userId || null,
    });

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'JOB_REQUISITION_CREATED',
      entity: 'JobRequisition',
      entityId: requisition._id,
      metadata: { code: requisition.requisitionCode, title: requisition.title },
    });

    return requisition;
  }

  /**
   * Retrieves requisitions with populated references and stage metrics
   * @param {string} orgId
   * @param {object} filters
   * @returns {Promise<Array<object>>}
   */
  async getRequisitions(orgId, filters = {}) {
    const query = { organizationId: orgId };

    if (filters.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters.departmentId) {
      query.departmentId = filters.departmentId;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ title: searchRegex }, { requisitionCode: searchRegex }];
    }

    const requisitions = await JobRequisition.find(query)
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code')
      .populate('locationId', 'name city')
      .populate('hiringManagerId', 'firstName lastName employeeCode workEmail')
      .sort({ createdAt: -1 });

    // Attach candidate stage statistics for each requisition
    const enriched = await Promise.all(
      requisitions.map(async (reqDoc) => {
        const counts = await Candidate.aggregate([
          { $match: { requisitionId: reqDoc._id } },
          { $group: { _id: '$stage', count: { $sum: 1 } } },
        ]);

        const stageBreakdown = {
          APPLIED: 0,
          SCREENING: 0,
          INTERVIEW: 0,
          OFFERED: 0,
          HIRED: 0,
          REJECTED: 0,
          total: 0,
        };

        counts.forEach((item) => {
          if (stageBreakdown[item._id] !== undefined) {
            stageBreakdown[item._id] = item.count;
          }
          stageBreakdown.total += item.count;
        });

        return {
          ...reqDoc.toObject(),
          stageBreakdown,
        };
      })
    );

    return enriched;
  }

  /**
   * Retrieves single requisition by ID
   */
  async getRequisitionById(orgId, requisitionId) {
    const requisition = await JobRequisition.findOne({ _id: requisitionId, organizationId: orgId })
      .populate('departmentId', 'name code')
      .populate('designationId', 'title code')
      .populate('locationId', 'name city')
      .populate('hiringManagerId', 'firstName lastName employeeCode workEmail');

    if (!requisition) {
      const err = new Error('Job requisition not found');
      err.statusCode = 404;
      throw err;
    }

    const candidates = await Candidate.find({ requisitionId: requisition._id })
      .populate('convertedEmployeeId', 'employeeCode firstName lastName workEmail')
      .sort({ createdAt: -1 });

    return { requisition, candidates };
  }

  /**
   * Updates an existing requisition
   */
  async updateRequisition(orgId, requisitionId, data, userId) {
    const requisition = await JobRequisition.findOne({ _id: requisitionId, organizationId: orgId });
    if (!requisition) {
      const err = new Error('Job requisition not found');
      err.statusCode = 404;
      throw err;
    }

    if (data.title !== undefined) requisition.title = data.title;
    if (data.departmentId !== undefined) requisition.departmentId = data.departmentId;
    if (data.designationId !== undefined) requisition.designationId = data.designationId;
    if (data.locationId !== undefined) requisition.locationId = data.locationId;
    if (data.employmentType !== undefined) requisition.employmentType = data.employmentType;
    if (data.openingsCount !== undefined) requisition.openingsCount = Number(data.openingsCount);
    if (data.experienceMin !== undefined) requisition.experienceMin = Number(data.experienceMin);
    if (data.experienceMax !== undefined) requisition.experienceMax = Number(data.experienceMax);
    if (data.budgetMin !== undefined) requisition.budgetMin = Number(data.budgetMin);
    if (data.budgetMax !== undefined) requisition.budgetMax = Number(data.budgetMax);
    if (data.hiringManagerId !== undefined) requisition.hiringManagerId = data.hiringManagerId;
    if (data.status !== undefined) requisition.status = data.status;
    if (data.priority !== undefined) requisition.priority = data.priority;
    if (data.targetDate !== undefined) requisition.targetDate = data.targetDate;
    if (data.jobDescription !== undefined) requisition.jobDescription = data.jobDescription;
    if (data.skills !== undefined) {
      requisition.skills = Array.isArray(data.skills) ? data.skills : data.skills.split(',').map((s) => s.trim());
    }

    await requisition.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'JOB_REQUISITION_UPDATED',
      entity: 'JobRequisition',
      entityId: requisition._id,
      metadata: { code: requisition.requisitionCode, status: requisition.status },
    });

    return requisition;
  }

  /**
   * Adds a new candidate application to a requisition
   */
  async addCandidate(orgId, data, userId = null) {
    const { requisitionId, email } = data;
    const cleanEmail = (email || '').toLowerCase().trim();

    const requisition = await JobRequisition.findOne({ _id: requisitionId, organizationId: orgId });
    if (!requisition) {
      const err = new Error('Requisition not found or does not belong to organization');
      err.statusCode = 404;
      throw err;
    }

    const existingCandidate = await Candidate.findOne({ requisitionId, email: cleanEmail });
    if (existingCandidate) {
      const err = new Error(`Candidate with email '${cleanEmail}' has already applied for this position`);
      err.statusCode = 409;
      throw err;
    }

    const candidate = await Candidate.create({
      organizationId: orgId,
      requisitionId,
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      email: cleanEmail,
      phone: data.phone?.trim() || '',
      totalExperience: Number(data.totalExperience) || 0,
      currentCompany: data.currentCompany?.trim() || '',
      currentCtc: Number(data.currentCtc) || 0,
      expectedCtc: Number(data.expectedCtc) || 0,
      noticePeriodDays: Number(data.noticePeriodDays) || 30,
      resumeUrl: data.resumeUrl?.trim() || '',
      portfolioUrl: data.portfolioUrl?.trim() || '',
      stage: data.stage || 'APPLIED',
      rating: data.rating ? Number(data.rating) : null,
      source: data.source || 'PORTAL',
      notes: data.notes?.trim() || '',
    });

    return candidate;
  }

  /**
   * Lists candidates with optional filtering by requisition and stage
   */
  async getCandidates(orgId, filters = {}) {
    const query = { organizationId: orgId };

    if (filters.requisitionId) {
      query.requisitionId = filters.requisitionId;
    }

    if (filters.stage && filters.stage !== 'ALL') {
      query.stage = filters.stage;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { currentCompany: searchRegex },
      ];
    }

    return await Candidate.find(query)
      .populate('requisitionId', 'title requisitionCode departmentId')
      .populate('convertedEmployeeId', 'employeeCode firstName lastName workEmail')
      .sort({ createdAt: -1 });
  }

  /**
   * Updates candidate recruitment pipeline stage and evaluation
   */
  async updateCandidateStage(orgId, candidateId, data, userId = null) {
    const candidate = await Candidate.findOne({ _id: candidateId, organizationId: orgId });
    if (!candidate) {
      const err = new Error('Candidate record not found');
      err.statusCode = 404;
      throw err;
    }

    const previousStage = candidate.stage;
    if (data.stage && data.stage !== previousStage) {
      candidate.stage = data.stage;

      // When candidate is marked HIRED, increment requisition filledCount
      if (data.stage === 'HIRED' && previousStage !== 'HIRED') {
        const reqDoc = await JobRequisition.findById(candidate.requisitionId);
        if (reqDoc) {
          reqDoc.filledCount = (reqDoc.filledCount || 0) + 1;
          if (reqDoc.filledCount >= reqDoc.openingsCount) {
            reqDoc.status = 'FILLED';
          }
          await reqDoc.save();
        }
      }
    }

    if (data.rating !== undefined) candidate.rating = Number(data.rating);
    if (data.rejectionReason !== undefined) candidate.rejectionReason = data.rejectionReason;
    if (data.notes !== undefined) candidate.notes = data.notes;

    if (data.offerDetails) {
      candidate.offerDetails = {
        offeredCtc: Number(data.offerDetails.offeredCtc) || candidate.offerDetails.offeredCtc || 0,
        joiningDate: data.offerDetails.joiningDate || candidate.offerDetails.joiningDate || null,
        notes: data.offerDetails.notes || candidate.offerDetails.notes || '',
        offeredAt: new Date(),
      };
    }

    if (data.newEvaluation) {
      candidate.evaluations.push({
        stage: data.newEvaluation.stage || candidate.stage,
        evaluatorName: data.newEvaluation.evaluatorName || 'Hiring Panel',
        score: Number(data.newEvaluation.score) || 4,
        feedback: data.newEvaluation.feedback || '',
        evaluatedAt: new Date(),
      });
    }

    await candidate.save();

    await recordAuditLog({
      organizationId: orgId,
      userId,
      action: 'CANDIDATE_STAGE_UPDATED',
      entity: 'Candidate',
      entityId: candidate._id,
      metadata: { previousStage, newStage: candidate.stage, candidateName: `${candidate.firstName} ${candidate.lastName}` },
    });

    return candidate;
  }

  /**
   * 1-Click Candidate to Employee Onboarding Conversion
   * Seamlessly turns a hired applicant into an official active employee record
   * and auto-grants standard leave quotas
   */
  async convertCandidateToEmployee(orgId, candidateId, employeeDetails = {}, actorUserId = null) {
    const candidate = await Candidate.findOne({ _id: candidateId, organizationId: orgId }).populate('requisitionId');
    if (!candidate) {
      const err = new Error('Candidate not found');
      err.statusCode = 404;
      throw err;
    }

    if (candidate.convertedEmployeeId) {
      const err = new Error('This candidate has already been converted to an active employee record');
      err.statusCode = 409;
      throw err;
    }

    const requisition = candidate.requisitionId;

    // Build payload for new employee
    const joiningDate = employeeDetails.joiningDate || candidate.offerDetails?.joiningDate || new Date();
    const workEmail = employeeDetails.workEmail || candidate.email;

    const newEmployee = await employeeService.createEmployee(
      orgId,
      {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        workEmail,
        personalEmail: candidate.email,
        phone: candidate.phone,
        departmentId: employeeDetails.departmentId || requisition?.departmentId || null,
        designationId: employeeDetails.designationId || requisition?.designationId || null,
        locationId: employeeDetails.locationId || requisition?.locationId || null,
        employmentType: employeeDetails.employmentType || requisition?.employmentType || 'FULL_TIME',
        status: 'ACTIVE',
        joiningDate,
      },
      actorUserId
    );

    // Update candidate record
    candidate.convertedEmployeeId = newEmployee._id;
    candidate.stage = 'HIRED';
    await candidate.save();

    // Update requisition filled count and status
    if (requisition) {
      const reqDoc = await JobRequisition.findById(requisition._id);
      if (reqDoc) {
        reqDoc.filledCount = (reqDoc.filledCount || 0) + 1;
        if (reqDoc.filledCount >= reqDoc.openingsCount) {
          reqDoc.status = 'FILLED';
        }
        await reqDoc.save();
      }
    }

    // Auto-grant leave balance for current year
    const currentYear = new Date(joiningDate).getFullYear() || new Date().getFullYear();
    await leaveService.grantInitialLeaveBalances(orgId, newEmployee._id, currentYear, actorUserId);

    // Sync candidate resume to employee document repository
    if (candidate.resumeUrl) {
      try {
        await employeeService.addEmployeeDocument(
          orgId,
          newEmployee._id,
          {
            docType: 'RESUME',
            title: `Resume - ${candidate.firstName} ${candidate.lastName}`,
            fileName: 'candidate_resume.pdf',
            fileUrl: candidate.resumeUrl,
            status: 'VERIFIED',
            notes: 'Auto-migrated from recruitment ATS applicant profile',
          },
          actorUserId
        );
      } catch (docErr) {
        console.warn('⚠️ Could not attach resume to employee documents:', docErr.message);
      }
    }

    await recordAuditLog({
      organizationId: orgId,
      userId: actorUserId,
      action: 'CANDIDATE_CONVERTED_TO_EMPLOYEE',
      entity: 'Employee',
      entityId: newEmployee._id,
      metadata: {
        candidateId: candidate._id,
        employeeCode: newEmployee.employeeCode,
        workEmail: newEmployee.workEmail,
      },
    });

    return {
      message: `Candidate ${candidate.firstName} ${candidate.lastName} successfully onboarded as employee ${newEmployee.employeeCode}`,
      employee: newEmployee,
      candidate,
    };
  }
}

export const recruitmentService = new RecruitmentService();
