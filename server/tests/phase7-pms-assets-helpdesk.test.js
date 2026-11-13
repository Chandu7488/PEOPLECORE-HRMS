import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { Goal } from '../src/modules/performance/goal.model.js';
import { performanceService } from '../src/modules/performance/performance.service.js';
import { Asset } from '../src/modules/assets/asset.model.js';
import { assetService } from '../src/modules/assets/asset.service.js';
import { ExpenseClaim } from '../src/modules/expenses/expense.model.js';
import { expenseService } from '../src/modules/expenses/expense.service.js';
import { HelpdeskTicket } from '../src/modules/helpdesk/helpdesk.model.js';
import { helpdeskService } from '../src/modules/helpdesk/helpdesk.service.js';

describe('Phase 7: Performance, Assets, Expenses & Helpdesk Self-Tests', () => {
  let org;
  let hrAdminUser;
  let testEmp;
  let createdGoal;
  let createdAsset;
  let createdClaim;
  let createdTicket;

  before(async () => {
    await connectDB();
    org = await Organization.findOne();
    hrAdminUser = await User.findOne({ email: 'hr@peoplecore.local' });
    testEmp = await Employee.findOne({ workEmail: 'employee@peoplecore.local' });

    // Clean up test data
    await Goal.deleteMany({ organizationId: org._id, title: /Phase7 Test/i });
    await Asset.deleteMany({ organizationId: org._id, assetTag: /AST-LAP-TEST/i });
    await ExpenseClaim.deleteMany({ organizationId: org._id, title: /Phase7 Test/i });
    await HelpdeskTicket.deleteMany({ organizationId: org._id, subject: /Phase7 Test/i });
  });

  after(async () => {
    await disconnectDB();
  });

  test('1. Goal / OKR creation, self-progress tracking and manager evaluation', async () => {
    createdGoal = await performanceService.createGoal(
      org._id,
      testEmp._id,
      {
        title: 'Phase7 Test: Deliver Microservices Reliability Architecture',
        category: 'TECHNICAL',
        description: 'Achieve 99.99% uptime with circuit breaking',
        progressPercentage: 40,
        weightage: 30,
        year: 2026,
      },
      hrAdminUser._id
    );

    assert.ok(createdGoal, 'Goal must be created');
    assert.equal(createdGoal.progressPercentage, 40);
    assert.equal(createdGoal.status, 'IN_PROGRESS');

    // Update progress
    const updated = await performanceService.updateGoalProgress(
      org._id,
      createdGoal._id,
      { progressPercentage: 100, selfRating: 5 },
      { _id: testEmp.userId, roles: ['EMPLOYEE'] }
    );
    assert.equal(updated.status, 'COMPLETED');
    assert.equal(updated.selfRating, 5);

    // Manager evaluation
    const evaluated = await performanceService.evaluateGoal(
      org._id,
      createdGoal._id,
      { managerRating: 5, managerFeedback: 'Exceeded expectations. Rock-solid execution.' },
      hrAdminUser
    );
    assert.equal(evaluated.managerRating, 5);
    assert.equal(evaluated.managerFeedback, 'Exceeded expectations. Rock-solid execution.');
  });

  test('2. Company Asset cataloging, allocation to employee, and return custody', async () => {
    createdAsset = await assetService.createAsset(
      org._id,
      {
        assetTag: 'AST-LAP-TEST01',
        name: 'MacBook Pro 16" M3 Max',
        category: 'LAPTOP',
        serialNumber: 'SN-APPLE-998877',
        cost: 249000,
        status: 'AVAILABLE',
      },
      hrAdminUser._id
    );

    assert.ok(createdAsset, 'Asset must be created');
    assert.equal(createdAsset.status, 'AVAILABLE');

    // Allocate to test employee
    const allocated = await assetService.allocateAsset(org._id, createdAsset._id, testEmp._id, hrAdminUser._id);
    assert.equal(allocated.status, 'ALLOCATED');
    assert.equal(allocated.allocatedTo.toString(), testEmp._id.toString());

    // Return asset custody
    const returned = await assetService.returnAsset(org._id, createdAsset._id, 'Hardware inspected. No damage.', hrAdminUser._id);
    assert.equal(returned.status, 'AVAILABLE');
    assert.equal(returned.allocatedTo, null);
  });

  test('3. Expense Reimbursement claim submission and managerial approval', async () => {
    createdClaim = await expenseService.submitClaim(
      org._id,
      testEmp._id,
      {
        title: 'Phase7 Test: Client Onsite Travel & High-Speed Internet',
        category: 'TRAVEL',
        amount: 8500,
        remarks: 'Direct flight ticket and transit cabs',
      },
      testEmp.userId
    );

    assert.ok(createdClaim, 'Expense claim must be created');
    assert.ok(createdClaim.claimNumber.startsWith('EXP-'), 'Must have generated claim number');
    assert.equal(createdClaim.status, 'SUBMITTED');
    assert.equal(createdClaim.amount, 8500);

    // Approve claim
    const approved = await expenseService.reviewClaim(
      org._id,
      createdClaim._id,
      { status: 'APPROVED', remarks: 'Reimbursement verified against original tax invoices.' },
      hrAdminUser
    );
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.reviewedBy.toString(), hrAdminUser._id.toString());
  });

  test('4. Helpdesk Support Ticket logging, status progression, and resolution', async () => {
    createdTicket = await helpdeskService.createTicket(
      org._id,
      testEmp._id,
      {
        subject: 'Phase7 Test: Docker Daemon Access on Development Workstation',
        category: 'IT_SUPPORT',
        priority: 'HIGH',
        description: 'Need sudo access to docker.sock for local Kubernetes deployment testing.',
      },
      testEmp.userId
    );

    assert.ok(createdTicket, 'Ticket must be created');
    assert.ok(createdTicket.ticketNumber.startsWith('TICK-'), 'Must have TICK- prefix');
    assert.equal(createdTicket.status, 'OPEN');
    assert.equal(createdTicket.priority, 'HIGH');

    // Resolve ticket
    const resolved = await helpdeskService.updateTicketStatus(
      org._id,
      createdTicket._id,
      {
        status: 'RESOLVED',
        resolutionNotes: 'Added employee username to docker system group. Verified access.',
        assignedTo: hrAdminUser._id,
      },
      hrAdminUser
    );

    assert.equal(resolved.status, 'RESOLVED');
    assert.ok(resolved.resolvedAt, 'Resolved date must be captured');
  });
});
