import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { Department } from '../src/modules/organization/department.model.js';
import { Designation } from '../src/modules/organization/designation.model.js';
import { Location } from '../src/modules/organization/location.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { JobRequisition } from '../src/modules/recruitment/jobRequisition.model.js';
import { Candidate } from '../src/modules/recruitment/candidate.model.js';
import { recruitmentService } from '../src/modules/recruitment/recruitment.service.js';
import { Resignation } from '../src/modules/offboarding/resignation.model.js';
import { OffboardingTask } from '../src/modules/offboarding/offboardingTask.model.js';
import { offboardingService } from '../src/modules/offboarding/offboarding.service.js';
import { LeaveLedger } from '../src/modules/leave/leaveLedger.model.js';

describe('Phase 6: Talent Acquisition & Offboarding Engine Self-Tests', () => {
  let org;
  let engineeringDept;
  let techLeadDesig;
  let hrAdminUser;
  let testEmp;
  let createdRequisition;
  let createdCandidate;
  let onboardedEmployee;
  let createdResignation;

  before(async () => {
    await connectDB();
    org = await Organization.findOne();
    hrAdminUser = await User.findOne({ email: 'hr@peoplecore.local' });
    testEmp = await Employee.findOne({ workEmail: 'employee@peoplecore.local' });

    engineeringDept = await Department.findOne({ organizationId: org._id, code: 'ENG' });
    if (!engineeringDept) {
      engineeringDept = await Department.create({
        organizationId: org._id,
        name: 'Engineering',
        code: 'ENG',
      });
    }

    techLeadDesig = await Designation.findOne({ organizationId: org._id, code: 'TECH_LEAD' });
    if (!techLeadDesig) {
      techLeadDesig = await Designation.create({
        organizationId: org._id,
        title: 'Technical Lead',
        code: 'TECH_LEAD',
      });
    }

    // Clean up previous test artifacts
    await JobRequisition.deleteMany({ organizationId: org._id, title: /Phase6 Test Position/i });
    await Candidate.deleteMany({ organizationId: org._id, email: /phase6test/i });
    await Employee.deleteMany({ organizationId: org._id, workEmail: 'ananya.sharma@peoplecore.local' });
    await Resignation.deleteMany({ organizationId: org._id });
    await OffboardingTask.deleteMany({ organizationId: org._id });
  });

  after(async () => {
    // Reset testEmp and user status to ACTIVE for subsequent tests
    if (testEmp) {
      await Employee.findByIdAndUpdate(testEmp._id, { status: 'ACTIVE' });
      if (testEmp.userId) {
        await User.findByIdAndUpdate(testEmp.userId, { status: 'ACTIVE' });
      }
    }
    await Employee.deleteMany({ organizationId: org._id, workEmail: 'ananya.sharma@peoplecore.local' });
    await disconnectDB();
  });

  test('1. Job Requisition creation auto-assigns code and default open status', async () => {
    createdRequisition = await recruitmentService.createRequisition(
      org._id,
      {
        title: 'Phase6 Test Position: Staff Cloud Architect',
        departmentId: engineeringDept._id,
        designationId: techLeadDesig._id,
        openingsCount: 1,
        experienceMin: 5,
        experienceMax: 10,
        budgetMin: 1800000,
        budgetMax: 2400000,
        priority: 'HIGH',
        jobDescription: 'Architect resilient multi-tenant enterprise microservices',
        skills: ['Node.js', 'MongoDB', 'Docker', 'AWS'],
      },
      hrAdminUser._id
    );

    assert.ok(createdRequisition, 'Requisition should be created');
    assert.ok(createdRequisition.requisitionCode.startsWith('REQ-'), 'Code should have REQ- prefix');
    assert.equal(createdRequisition.status, 'OPEN');
    assert.equal(createdRequisition.openingsCount, 1);
    assert.equal(createdRequisition.filledCount, 0);
  });

  test('2. Candidate application links to requisition and tracks stage metrics', async () => {
    createdCandidate = await recruitmentService.addCandidate(
      org._id,
      {
        requisitionId: createdRequisition._id,
        firstName: 'Ananya',
        lastName: 'Sharma',
        email: 'phase6test.ananya@example.com',
        phone: '+91 9876543210',
        totalExperience: 7,
        currentCompany: 'Infosys Ltd',
        currentCtc: 1600000,
        expectedCtc: 2100000,
        noticePeriodDays: 30,
        resumeUrl: 'https://storage.peoplecore.local/resumes/ananya-sharma.pdf',
        source: 'LINKEDIN',
      },
      hrAdminUser._id
    );

    assert.ok(createdCandidate, 'Candidate should be added');
    assert.equal(createdCandidate.stage, 'APPLIED');
    assert.equal(createdCandidate.email, 'phase6test.ananya@example.com');

    // Retrieve requisitions and verify stage breakdown
    const reqList = await recruitmentService.getRequisitions(org._id, { search: 'Staff Cloud Architect' });
    assert.equal(reqList.length, 1);
    assert.equal(reqList[0].stageBreakdown.APPLIED, 1);
    assert.equal(reqList[0].stageBreakdown.total, 1);
  });

  test('3. Pipeline stage transitions: SCREENING -> INTERVIEW -> OFFERED -> HIRED', async () => {
    // 3a: Move to INTERVIEW with rating and panel feedback
    const candidateInInterview = await recruitmentService.updateCandidateStage(
      org._id,
      createdCandidate._id,
      {
        stage: 'INTERVIEW',
        rating: 5,
        newEvaluation: {
          stage: 'TECHNICAL_ROUND',
          evaluatorName: 'Engineering Director',
          score: 5,
          feedback: 'Exceptional systems design knowledge, deep understanding of Mongoose indexing.',
        },
      },
      hrAdminUser._id
    );

    assert.equal(candidateInInterview.stage, 'INTERVIEW');
    assert.equal(candidateInInterview.rating, 5);
    assert.equal(candidateInInterview.evaluations.length, 1);

    // 3b: Move to OFFERED with compensation terms
    const candidateOffered = await recruitmentService.updateCandidateStage(
      org._id,
      createdCandidate._id,
      {
        stage: 'OFFERED',
        offerDetails: {
          offeredCtc: 2200000,
          joiningDate: new Date('2026-04-01'),
          notes: 'Standard 30-day notice buyout agreed upon.',
        },
      },
      hrAdminUser._id
    );

    assert.equal(candidateOffered.stage, 'OFFERED');
    assert.equal(candidateOffered.offerDetails.offeredCtc, 2200000);
  });

  test('4. 1-Click Candidate to Employee Conversion creates active employee and seeds leave balance', async () => {
    const conversionResult = await recruitmentService.convertCandidateToEmployee(
      org._id,
      createdCandidate._id,
      {
        workEmail: 'ananya.sharma@peoplecore.local',
        joiningDate: new Date('2026-04-01'),
        departmentId: engineeringDept._id,
        designationId: techLeadDesig._id,
      },
      hrAdminUser._id
    );

    assert.ok(conversionResult.employee, 'New employee record must be created');
    onboardedEmployee = conversionResult.employee;
    assert.equal(onboardedEmployee.firstName, 'Ananya');
    assert.equal(onboardedEmployee.workEmail, 'ananya.sharma@peoplecore.local');
    assert.equal(onboardedEmployee.status, 'ACTIVE');
    assert.ok(onboardedEmployee.employeeCode.startsWith('EMP'), 'Must have generated employee code');

    // Candidate should now reference employee and be marked HIRED
    const updatedCandidate = await Candidate.findById(createdCandidate._id);
    assert.equal(updatedCandidate.stage, 'HIRED');
    assert.equal(updatedCandidate.convertedEmployeeId.toString(), onboardedEmployee._id.toString());

    // Requisition should now be marked FILLED since openingsCount was 1
    const updatedReq = await JobRequisition.findById(createdRequisition._id);
    assert.equal(updatedReq.filledCount, 1);
    assert.equal(updatedReq.status, 'FILLED');

    // Verify annual leave quota was granted automatically
    const ledgers = await LeaveLedger.find({
      organizationId: org._id,
      employeeId: onboardedEmployee._id,
      transactionType: 'OPENING_GRANT',
    });
    assert.ok(ledgers.length > 0, 'New employee must have opening leave ledger records');
  });

  test('5. Employee submits resignation and system auto-seeds 5 departmental clearance tasks', async () => {
    createdResignation = await offboardingService.submitResignation(
      org._id,
      testEmp._id,
      {
        resignationDate: '2026-03-01',
        proposedLastWorkingDay: '2026-03-31',
        noticePeriodDays: 30,
        reasonCategory: 'CAREER_GROWTH',
        reasonDetails: 'Pursuing senior leadership opportunities elsewhere.',
        handoverNotes: 'Knowledge transfer repository shared with team lead.',
      },
      testEmp.userId
    );

    assert.ok(createdResignation, 'Resignation record must be created');
    assert.equal(createdResignation.status, 'SUBMITTED');
    assert.equal(createdResignation.settlementStatus, 'PENDING');

    // Verify clearance checklist auto-seeded 5 tasks
    const tasks = await OffboardingTask.find({ resignationId: createdResignation._id });
    assert.equal(tasks.length, 5, 'Must seed exactly 5 departmental clearance tasks');
    const categories = tasks.map((t) => t.category);
    assert.ok(categories.includes('IT_ASSETS'));
    assert.ok(categories.includes('FINANCE_SETTLEMENT'));
    assert.ok(categories.includes('HR_EXIT_INTERVIEW'));
    assert.ok(categories.includes('ADMIN_FACILITY'));
    assert.ok(categories.includes('ACCESS_REVOCATION'));
  });

  test('6. HR Admin reviews and approves resignation, putting employee on NOTICE_PERIOD', async () => {
    const reviewed = await offboardingService.reviewResignation(
      org._id,
      createdResignation._id,
      {
        status: 'APPROVED',
        approvedLastWorkingDay: '2026-03-31',
        approverNotes: 'Resignation accepted. Notice period will conclude on March 31, 2026.',
      },
      hrAdminUser
    );

    assert.equal(reviewed.status, 'APPROVED');
    assert.equal(reviewed.settlementStatus, 'TASKS_IN_PROGRESS');

    // Employee status in database must be updated to NOTICE_PERIOD
    const empInDb = await Employee.findById(testEmp._id);
    assert.equal(empInDb.status, 'NOTICE_PERIOD');
  });

  test('7. Departmental clearance task updates transition resignation to CLEARED once all are cleared', async () => {
    const tasks = await OffboardingTask.find({ resignationId: createdResignation._id });

    // Mark 4 tasks cleared and 1 task waived
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const statusToSet = i === 3 ? 'WAIVED' : 'CLEARED';
      await offboardingService.updateClearanceTask(
        org._id,
        task._id,
        {
          status: statusToSet,
          remarks: `Clearance verified by authorized personnel: ${statusToSet}`,
        },
        hrAdminUser
      );
    }

    // Check resignation settlementStatus
    const updatedResignation = await Resignation.findById(createdResignation._id);
    assert.equal(updatedResignation.settlementStatus, 'CLEARED', 'Settlement status must be CLEARED once all tasks are done');
  });

  test('8. Full & Final settlement calculation and finalization terminates employee and revokes user credentials', async () => {
    // 8a: Compute settlement estimates
    const calc = await offboardingService.calculateSettlement(org._id, createdResignation._id);
    assert.ok(calc, 'Settlement calculations should return values');
    assert.equal(calc.noticePeriodDays, 30);
    assert.equal(typeof calc.encashableLeaveDays, 'number');

    // 8b: Finalize settlement
    const finalizeRes = await offboardingService.finalizeSettlement(
      org._id,
      createdResignation._id,
      {
        noticeShortfallDays: 0,
        encashableLeaveDays: calc.encashableLeaveDays,
        payableDays: 31,
        settlementAmount: 85000,
        remarks: 'All dues settled, PF transfer initiated, laptop returned in pristine condition.',
      },
      hrAdminUser
    );

    assert.ok(finalizeRes.resignation, 'Must return finalized resignation');
    assert.equal(finalizeRes.resignation.settlementStatus, 'SETTLED');
    assert.equal(finalizeRes.employee.status, 'TERMINATED', 'Employee record must be marked TERMINATED');

    // Verify associated User account has status TERMINATED for airtight security
    if (testEmp.userId) {
      const updatedUser = await User.findById(testEmp.userId);
      assert.equal(updatedUser.status, 'TERMINATED', 'User credentials must be deactivated upon exit');
    }
  });
});
