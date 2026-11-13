import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Organization } from '../src/modules/organization/organization.model.js';
import { Department } from '../src/modules/organization/department.model.js';
import { User } from '../src/modules/users/user.model.js';
import { Employee } from '../src/modules/employees/employee.model.js';
import { HolidayCalendar } from '../src/modules/holidays/holidayCalendar.model.js';
import { Holiday } from '../src/modules/holidays/holiday.model.js';
import { Notice } from '../src/modules/notices/notice.model.js';
import { NoticeReceipt } from '../src/modules/notices/noticeReceipt.model.js';
import { holidayService } from '../src/modules/holidays/holiday.service.js';
import { noticeService } from '../src/modules/notices/notice.service.js';
import { sanitizeHtml } from '../src/utils/sanitize.js';

describe('Phase 3: Holiday Calendar & Notice Board Self-Tests', () => {
  let org;
  let adminUser;
  let hrEmployee;
  let engEmployee;
  let engDept;
  let hrDept;

  before(async () => {
    await connectDB();
    org = await Organization.findOne();
    adminUser = await User.findOne({ email: 'admin@peoplecore.local' });
    hrEmployee = await Employee.findOne({ workEmail: 'hr@peoplecore.local' });
    engEmployee = await Employee.findOne({ workEmail: 'employee@peoplecore.local' });
    engDept = await Department.findOne({ organizationId: org._id, code: 'ENG' });
    hrDept = await Department.findOne({ organizationId: org._id, code: 'HR' });
  });

  after(async () => {
    await disconnectDB();
  });

  test('1. Published company calendar is retrieved with all active holidays', async () => {
    const res = await holidayService.getPublishedCompanyCalendar(org._id, 2026);
    assert.ok(res.calendar, 'Published calendar should exist');
    assert.equal(res.calendar.status, 'PUBLISHED');
    assert.ok(res.holidays.length >= 7, 'Should contain at least 7 seeded holidays');
  });

  test('2. CSV spreadsheet parsing parses dates, names, and confidence scores for HR review', () => {
    const sampleCsv = `Date,Holiday Name,Type,Is Paid
2026-01-26,Republic Day,NATIONAL,true
2026-08-15,Independence Day,NATIONAL,true
15-09-2026,Engineers Day,COMPANY,true`;

    const parsed = holidayService.parseCsvSpreadsheet(sampleCsv);
    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].localDate, '2026-01-26');
    assert.equal(parsed[0].name, 'Republic Day');
    assert.equal(parsed[2].localDate, '2026-09-15', 'Should convert DD-MM-YYYY to YYYY-MM-DD');
  });

  test('3. Draft calendar creation, duplicate check, and publishing workflow', async () => {
    const draft = await holidayService.createCalendar(org._id, {
      name: 'Test Draft Calendar 2027',
      year: 2027,
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    });

    assert.equal(draft.calendar.status, 'DRAFT');

    // Add holiday
    const h1 = await holidayService.addHoliday(draft.calendar._id, {
      localDate: '2027-01-26',
      name: 'Republic Day',
      type: 'NATIONAL',
    });
    assert.ok(h1._id);

    // Duplicate holiday on same date and scope must fail with 409
    await assert.rejects(
      async () => {
        await holidayService.addHoliday(draft.calendar._id, {
          localDate: '2027-01-26',
          name: 'Republic Day Duplicate',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'DUPLICATE_HOLIDAY');
        return true;
      }
    );

    // Publish calendar
    const published = await holidayService.publishCalendar(draft.calendar._id, adminUser._id);
    assert.equal(published.calendar.status, 'PUBLISHED');
    assert.ok(published.calendar.publishedAt !== null);

    // Clean up test calendar
    await Holiday.deleteMany({ calendarId: draft.calendar._id });
    await HolidayCalendar.findByIdAndDelete(draft.calendar._id);
  });

  test('4. HTML sanitizer neutralizes stored XSS payloads (scripts, inline handlers, javascript: URIs)', () => {
    const maliciousHtml = `
      <p>Official Announcement</p>
      <script>alert("XSS Attack!")</script>
      <img src="x" onerror="alert('Hacked')">
      <a href="javascript:stealTokens()">Click here</a>
      <b>Safe Bold Text</b>
    `;

    const sanitized = sanitizeHtml(maliciousHtml);
    assert.ok(!sanitized.includes('<script>'), 'Must strip <script> tags');
    assert.ok(!sanitized.includes('onerror'), 'Must strip inline onerror handlers');
    assert.ok(!sanitized.includes('javascript:'), 'Must neutralize javascript: URLs');
    assert.ok(sanitized.includes('Official Announcement'));
    assert.ok(sanitized.includes('<b>Safe Bold Text</b>'));
    assert.ok(sanitized.includes('rel="noopener noreferrer"'), 'Must add rel="noopener noreferrer" to links');
  });

  test('5. Server-side audience targeting restricts notices outside employee scope', async () => {
    // Notice targeted strictly to Engineering Department
    const targetedNotice = await Notice.create({
      organizationId: org._id,
      title: 'Confidential Engineering Strategy',
      bodyHtml: '<p>Engineering internal only</p>',
      category: 'LEADERSHIP',
      audience: { type: 'DEPARTMENTS', targetIds: [engDept._id] },
      status: 'PUBLISHED',
      authorId: adminUser._id,
    });

    const engUser = await User.findById(engEmployee.userId);
    const payrollEmployee = await Employee.findOne({ workEmail: 'payroll@peoplecore.local' });
    const payrollUser = await User.findById(payrollEmployee.userId);

    // Engineering employee CAN view it
    const engView = await noticeService.getNoticeById(targetedNotice._id, engUser, engEmployee);
    assert.equal(engView._id.toString(), targetedNotice._id.toString());

    // Non-engineering employee (Payroll) is rejected with 403 Forbidden
    await assert.rejects(
      async () => {
        await noticeService.getNoticeById(targetedNotice._id, payrollUser, payrollEmployee);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // Clean up test notice
    await NoticeReceipt.deleteMany({ noticeId: targetedNotice._id });
    await Notice.findByIdAndDelete(targetedNotice._id);
  });

  test('6. Notice acknowledgement and reporting audit workflow', async () => {
    const ackNotice = await Notice.create({
      organizationId: org._id,
      title: 'Company Mandatory Policy 2026',
      bodyHtml: '<p>Please acknowledge compliance.</p>',
      category: 'POLICY',
      requiresAck: true,
      status: 'PUBLISHED',
      authorId: adminUser._id,
    });

    // Employee acknowledges
    const receipt = await noticeService.acknowledgeNotice(ackNotice._id, engEmployee._id);
    assert.ok(receipt.acknowledgedAt !== null);

    // Author/HR retrieves acknowledgement report
    const report = await noticeService.getAcknowledgementReport(ackNotice._id, adminUser);
    assert.equal(report.summary.totalAcknowledged, 1);
    assert.equal(report.receipts[0].employeeId._id.toString(), engEmployee._id.toString());

    // Clean up
    await NoticeReceipt.deleteMany({ noticeId: ackNotice._id });
    await Notice.findByIdAndDelete(ackNotice._id);
  });

  test('7. PDF & Document text parsing extracts all 13 holidays with exact dates and classification', async () => {
    const sampleCalendarText = `
Holiday Calendar 2026
Date Day Holiday
01 - January Thursday New Year Day
26 - January Monday Republic Day
04 - March Wednesday Holi
03 - April Friday Good Friday
01 - May Friday Laboure Day
27 - May Wednesday Eid al-Adha (Bakrid)*
15 - Aug Saturday Independence Day
28 - Aug Friday Raksha Bandhan
02 - October Friday Ghandhi Jayanti
20 - October Tuesday Dussehra (Vijay Dashmi)
08 - November Sunday Diwali
09 - November Monday Govardhan Puja
25 - December Friday Christmas Day
    `;

    const { detectedYear, rows } = holidayService.extractHolidaysFromText(sampleCalendarText);
    assert.equal(detectedYear, 2026, 'Year 2026 should be automatically detected');
    assert.equal(rows.length, 13, 'All 13 holidays should be extracted');

    const newYear = rows.find((r) => r.name === 'New Year Day');
    assert.ok(newYear, 'New Year Day should be present');
    assert.equal(newYear.localDate, '2026-01-01');

    const repDay = rows.find((r) => r.name === 'Republic Day');
    assert.ok(repDay, 'Republic Day should be present');
    assert.equal(repDay.localDate, '2026-01-26');
    assert.equal(repDay.type, 'NATIONAL');

    const bakrid = rows.find((r) => r.name.includes('Eid al-Adha'));
    assert.ok(bakrid, 'Eid al-Adha should be present');
    assert.equal(bakrid.localDate, '2026-05-27');
    assert.equal(bakrid.type, 'OPTIONAL', 'Asterisk-marked item should be categorized as OPTIONAL');

    const diwali = rows.find((r) => r.name === 'Diwali');
    assert.ok(diwali, 'Diwali should be present');
    assert.equal(diwali.localDate, '2026-11-08');
  });
});
