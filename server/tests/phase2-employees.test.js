import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { Department } from '../src/modules/organization/department.model.js';
import { Designation } from '../src/modules/organization/designation.model.js';
import { Location } from '../src/modules/organization/location.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { EmployeeJobHistory } from '../src/modules/employees/jobHistory.model.js';
import { employeeService } from '../src/modules/employees/employee.service.js';
import { organizationService } from '../src/modules/organization/organization.service.js';

describe('Phase 2: Organization & Employee Core Self-Tests', () => {
  let org;
  let testDept;
  let testDesig;
  let testLoc;
  const testEmail = 'phase2.test@peoplecore.local';
  let createdEmpId;

  before(async () => {
    await connectDB();
    org = await organizationService.getOrCreatePrimaryOrganization();
    testDept = await Department.findOne({ organizationId: org._id, code: 'ENG' });
    testDesig = await Designation.findOne({ organizationId: org._id, code: 'SR-SWE' });
    testLoc = await Location.findOne({ organizationId: org._id, code: 'BLR-01' });

    // Clean any previous test employee
    const existing = await Employee.findOne({ workEmail: testEmail });
    if (existing) {
      await EmployeeJobHistory.deleteMany({ employeeId: existing._id });
      await Employee.findByIdAndDelete(existing._id);
    }
  });

  after(async () => {
    if (createdEmpId) {
      await EmployeeJobHistory.deleteMany({ employeeId: createdEmpId });
      await Employee.findByIdAndDelete(createdEmpId);
    }
    await disconnectDB();
  });

  test('1. Organization master data retrieves departments, designations, and locations', async () => {
    const departments = await organizationService.getDepartments(org._id);
    const locations = await organizationService.getLocations(org._id);
    const designations = await organizationService.getDesignations(org._id);

    assert.ok(departments.length >= 4, 'Should have at least 4 departments');
    assert.ok(locations.length >= 3, 'Should have at least 3 locations');
    assert.ok(designations.length >= 5, 'Should have at least 5 designations');
  });

  test('2. Employee creation generates unique code and automatically logs JOINING history', async () => {
    const emp = await employeeService.createEmployee(org._id, {
      firstName: 'Test',
      lastName: 'Engineer',
      workEmail: testEmail,
      joiningDate: new Date('2025-02-01'),
      status: 'ACTIVE',
      departmentId: testDept._id,
      designationId: testDesig._id,
      locationId: testLoc._id,
    });

    createdEmpId = emp._id;
    assert.ok(emp.employeeCode, 'Employee code must be generated');
    assert.equal(emp.workEmail, testEmail);

    // Verify automatic job history creation
    const history = await employeeService.getEmployeeJobHistory(emp._id);
    assert.equal(history.length, 1, 'Should have exactly 1 initial history record');
    assert.equal(history[0].changeType, 'JOINING');
    assert.equal(history[0].departmentId._id.toString(), testDept._id.toString());
  });

  test('3. Duplicate employee code or work email is rejected with 409 DUPLICATE error', async () => {
    const existing = await Employee.findById(createdEmpId);

    // Attempt to create duplicate email
    await assert.rejects(
      async () => {
        await employeeService.createEmployee(org._id, {
          firstName: 'Duplicate',
          lastName: 'User',
          workEmail: testEmail,
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'DUPLICATE_EMAIL');
        return true;
      }
    );

    // Attempt to create duplicate code
    await assert.rejects(
      async () => {
        await employeeService.createEmployee(org._id, {
          firstName: 'Duplicate',
          lastName: 'Code',
          employeeCode: existing.employeeCode,
          workEmail: 'unique.email@peoplecore.local',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'DUPLICATE_CODE');
        return true;
      }
    );
  });

  test('4. Employee lifecycle transfer updates employee and records immutable history snapshot', async () => {
    const otherDept = await Department.findOne({ organizationId: org._id, code: 'HR' });
    const otherDesig = await Designation.findOne({ organizationId: org._id, code: 'SR-HR' });

    const transferDate = new Date('2026-06-01');
    const transferResult = await employeeService.transferEmployee(createdEmpId, {
      changeType: 'PROMOTION',
      effectiveDate: transferDate,
      departmentId: otherDept._id,
      designationId: otherDesig._id,
      notes: 'Promoted to Senior HR role',
    });

    assert.equal(transferResult.employee.departmentId._id.toString(), otherDept._id.toString());
    assert.equal(transferResult.employee.designationId._id.toString(), otherDesig._id.toString());

    // Verify history timeline contains 2 entries
    const history = await employeeService.getEmployeeJobHistory(createdEmpId);
    assert.equal(history.length, 2, 'History timeline should now have 2 records');
    assert.equal(history[0].changeType, 'PROMOTION');
    assert.equal(history[0].notes, 'Promoted to Senior HR role');
    assert.equal(history[1].changeType, 'JOINING');
  });

  test('5. Employee search and filtering by department functions accurately', async () => {
    const searchRes = await employeeService.getEmployees(org._id, { search: 'Test Engineer' });
    assert.ok(searchRes.employees.some((e) => e._id.toString() === createdEmpId.toString()));

    const hrDept = await Department.findOne({ organizationId: org._id, code: 'HR' });
    const filterRes = await employeeService.getEmployees(org._id, { departmentId: hrDept._id });
    assert.ok(filterRes.employees.every((e) => e.departmentId._id.toString() === hrDept._id.toString()));
  });
});
