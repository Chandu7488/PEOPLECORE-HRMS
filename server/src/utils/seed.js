import { User } from '../modules/users/user.model.js';
import { Organization } from '../modules/organization/organization.model.js';
import { Location } from '../modules/organization/location.model.js';
import { Department } from '../modules/organization/department.model.js';
import { Designation } from '../modules/organization/designation.model.js';
import { Employee } from '../modules/employees/employee.model.js';
import { EmployeeJobHistory } from '../modules/employees/jobHistory.model.js';
import { HolidayCalendar } from '../modules/holidays/holidayCalendar.model.js';
import { Holiday } from '../modules/holidays/holiday.model.js';
import { Notice } from '../modules/notices/notice.model.js';
import { ROLES } from '../config/roles.js';
import { hashPassword } from './crypto.js';
import { sanitizeHtml } from './sanitize.js';
import { connectDB, disconnectDB } from '../config/db.js';

/**
 * Seeds synthetic master data, demo users, holiday calendars, and notices
 */
export const seedAll = async () => {
  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Primary Organization
  let org = await Organization.findOne();
  if (!org) {
    org = await Organization.create({
      name: 'PeopleCore Technologies Ltd.',
      legalName: 'PeopleCore Technologies Private Limited',
      code: 'PCORE',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      fiscalYearStart: '04-01',
      fiscalYearEnd: '03-31',
      workWeek: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      address: {
        street: 'Outer Ring Road, Bellandur',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        pincode: '560103',
      },
      contactEmail: 'contact@peoplecore.local',
      phone: '+91 80 4000 1234',
      website: 'https://peoplecore.local',
    });
    console.log('  + Created Primary Organization:', org.name);
  }

  // 2. Locations
  const locationsData = [
    { name: 'Bengaluru HQ', code: 'BLR-01', city: 'Bengaluru', state: 'Karnataka', isHeadquarters: true },
    { name: 'Mumbai Tech Hub', code: 'MUM-01', city: 'Mumbai', state: 'Maharashtra', isHeadquarters: false },
    { name: 'Delhi NCR Office', code: 'DEL-01', city: 'Gurugram', state: 'Haryana', isHeadquarters: false },
  ];
  const locationsMap = {};
  for (const loc of locationsData) {
    let doc = await Location.findOne({ organizationId: org._id, code: loc.code });
    if (!doc) {
      doc = await Location.create({ ...loc, organizationId: org._id });
      console.log('  + Created Location:', doc.name);
    }
    locationsMap[loc.code] = doc;
  }

  // 3. Departments
  const departmentsData = [
    { name: 'Engineering', code: 'ENG', description: 'Core software development and platform engineering' },
    { name: 'Human Resources', code: 'HR', description: 'People operations, recruitment, and culture' },
    { name: 'Finance & Payroll', code: 'FIN', description: 'Financial accounting, compliance, and payroll' },
    { name: 'Product & Design', code: 'PD', description: 'Product roadmap, UX/UI, and user research' },
  ];
  const departmentsMap = {};
  for (const dep of departmentsData) {
    let doc = await Department.findOne({ organizationId: org._id, code: dep.code });
    if (!doc) {
      doc = await Department.create({ ...dep, organizationId: org._id });
      console.log('  + Created Department:', doc.name);
    }
    departmentsMap[dep.code] = doc;
  }

  // 4. Designations
  const designationsData = [
    { title: 'Chief Executive Officer', code: 'CEO', level: 'Executive', departmentId: departmentsMap['ENG']._id },
    { title: 'Engineering Director', code: 'ENG-DIR', level: 'L1', departmentId: departmentsMap['ENG']._id },
    { title: 'Engineering Manager', code: 'ENG-MGR', level: 'L2', departmentId: departmentsMap['ENG']._id },
    { title: 'Senior Software Engineer', code: 'SR-SWE', level: 'L3', departmentId: departmentsMap['ENG']._id },
    { title: 'HR Director', code: 'HR-DIR', level: 'L1', departmentId: departmentsMap['HR']._id },
    { title: 'Senior HR Generalist', code: 'SR-HR', level: 'L2', departmentId: departmentsMap['HR']._id },
    { title: 'Payroll Manager', code: 'PAY-MGR', level: 'L2', departmentId: departmentsMap['FIN']._id },
  ];
  const designationsMap = {};
  for (const des of designationsData) {
    let doc = await Designation.findOne({ organizationId: org._id, code: des.code });
    if (!doc) {
      doc = await Designation.create({ ...des, organizationId: org._id });
      console.log('  + Created Designation:', doc.title);
    }
    designationsMap[des.code] = doc;
  }

  // 5. Seed / Update Demo Users & Authoritative Employee Records
  const defaultPassword = 'PeopleCore@2026';
  const passwordHash = await hashPassword(defaultPassword);

  const demoAccounts = [
    {
      code: 'EMP001',
      email: 'admin@peoplecore.local',
      firstName: 'Aarav',
      lastName: 'Sharma',
      roles: [ROLES.SUPER_ADMIN],
      deptCode: 'ENG',
      desigCode: 'CEO',
      locCode: 'BLR-01',
      managerEmail: null,
    },
    {
      code: 'EMP002',
      email: 'hr@peoplecore.local',
      firstName: 'Pooja',
      lastName: 'Iyer',
      roles: [ROLES.HR_ADMIN],
      deptCode: 'HR',
      desigCode: 'HR-DIR',
      locCode: 'BLR-01',
      managerEmail: 'admin@peoplecore.local',
    },
    {
      code: 'EMP003',
      email: 'executive@peoplecore.local',
      firstName: 'Vikram',
      lastName: 'Malhotra',
      roles: [ROLES.EXECUTIVE],
      deptCode: 'ENG',
      desigCode: 'ENG-DIR',
      locCode: 'BLR-01',
      managerEmail: 'admin@peoplecore.local',
    },
    {
      code: 'EMP004',
      email: 'manager@peoplecore.local',
      firstName: 'Rohan',
      lastName: 'Verma',
      roles: [ROLES.MANAGER],
      deptCode: 'ENG',
      desigCode: 'ENG-MGR',
      locCode: 'BLR-01',
      managerEmail: 'executive@peoplecore.local',
    },
    {
      code: 'EMP005',
      email: 'employee@peoplecore.local',
      firstName: 'Ananya',
      lastName: 'Patel',
      roles: [ROLES.EMPLOYEE],
      deptCode: 'ENG',
      desigCode: 'SR-SWE',
      locCode: 'MUM-01',
      managerEmail: 'manager@peoplecore.local',
    },
    {
      code: 'EMP006',
      email: 'payroll@peoplecore.local',
      firstName: 'Suresh',
      lastName: 'Nair',
      roles: [ROLES.PAYROLL_ADMIN],
      deptCode: 'FIN',
      desigCode: 'PAY-MGR',
      locCode: 'BLR-01',
      managerEmail: 'hr@peoplecore.local',
    },
  ];

  const employeeMap = {};
  const userMap = {};

  for (const item of demoAccounts) {
    let user = await User.findOne({ email: item.email });
    if (!user) {
      user = await User.create({
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        roles: item.roles,
        status: 'ACTIVE',
        passwordHash,
        organizationId: org._id,
      });
    } else {
      user.passwordHash = passwordHash;
      user.status = 'ACTIVE';
      user.organizationId = org._id;
      await user.save();
    }
    userMap[item.email] = user;

    let emp = await Employee.findOne({ organizationId: org._id, employeeCode: item.code });
    if (!emp) {
      emp = await Employee.create({
        organizationId: org._id,
        employeeCode: item.code,
        userId: user._id,
        firstName: item.firstName,
        lastName: item.lastName,
        workEmail: item.email,
        phone: '+91 98765 43210',
        joiningDate: new Date('2024-01-15'),
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
        departmentId: departmentsMap[item.deptCode]._id,
        designationId: designationsMap[item.desigCode]._id,
        locationId: locationsMap[item.locCode]._id,
      });

      await EmployeeJobHistory.create({
        employeeId: emp._id,
        organizationId: org._id,
        changeType: 'JOINING',
        effectiveDate: emp.joiningDate,
        departmentId: emp.departmentId,
        designationId: emp.designationId,
        locationId: emp.locationId,
        status: 'ACTIVE',
        notes: 'Initial appointment',
      });
      console.log(`  + Created Employee: ${emp.employeeCode} - ${emp.firstName} ${emp.lastName}`);
    }

    user.employeeId = emp._id;
    await user.save();
    employeeMap[item.email] = emp;
  }

  // Set manager hierarchy
  for (const item of demoAccounts) {
    if (item.managerEmail && employeeMap[item.managerEmail]) {
      const emp = employeeMap[item.email];
      const manager = employeeMap[item.managerEmail];
      if (emp && manager) {
        emp.managerId = manager._id;
        await emp.save();
      }
    }
  }

  // 6. Phase 3: Seed Published Holiday Calendar 2026
  let calendar = await HolidayCalendar.findOne({ organizationId: org._id, year: 2026 });
  if (!calendar) {
    calendar = await HolidayCalendar.create({
      organizationId: org._id,
      name: 'Company Holiday Calendar 2026',
      year: 2026,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'PUBLISHED',
      version: 1,
      publishedAt: new Date('2026-01-01'),
      publishedBy: userMap['admin@peoplecore.local']._id,
      createdBy: userMap['hr@peoplecore.local']._id,
    });

    const initialHolidays = [
      { localDate: '2026-01-26', name: 'Republic Day', type: 'NATIONAL', description: 'National Holiday' },
      { localDate: '2026-03-04', name: 'Holi', type: 'FESTIVAL', description: 'Festival of Colors' },
      { localDate: '2026-08-15', name: 'Independence Day', type: 'NATIONAL', description: 'National Holiday' },
      { localDate: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: 'NATIONAL', description: 'National Holiday' },
      { localDate: '2026-10-20', name: 'Dussehra', type: 'FESTIVAL', description: 'Vijayadashami' },
      { localDate: '2026-11-08', name: 'Diwali', type: 'FESTIVAL', description: 'Festival of Lights' },
      { localDate: '2026-12-25', name: 'Christmas Day', type: 'FESTIVAL', description: 'Christmas Celebration' },
    ];

    for (const h of initialHolidays) {
      await Holiday.create({
        calendarId: calendar._id,
        ...h,
        isPaid: true,
        scopeType: 'ALL',
      });
    }
    console.log('  + Created Published 2026 Holiday Calendar with 7 synthetic holidays');
  }

  // 7. Phase 3: Seed Official Company Notices
  const existingNotice = await Notice.findOne({ organizationId: org._id });
  if (!existingNotice) {
    await Notice.create({
      organizationId: org._id,
      title: 'Welcome to PeopleCore HRMS Platform',
      bodyHtml: sanitizeHtml(
        '<p>Welcome to <strong>PeopleCore HRMS</strong>! This platform serves as your central workplace portal for employee records, company holiday calendars, and organization updates.</p><p>Please review and acknowledge this notice.</p>'
      ),
      category: 'GENERAL',
      priority: 'IMPORTANT',
      audience: { type: 'ALL', targetIds: [] },
      isPinned: true,
      requiresAck: true,
      ackDueAt: new Date('2026-12-31'),
      status: 'PUBLISHED',
      authorId: userMap['admin@peoplecore.local']._id,
    });

    await Notice.create({
      organizationId: org._id,
      title: 'Official 2026 Company Holiday Calendar Released',
      bodyHtml: sanitizeHtml(
        '<p>The HR operations team has finalized and published the <strong>2026 Company Holiday Calendar</strong>. You can view all upcoming public and festival holidays in the Calendar tab.</p>'
      ),
      category: 'HOLIDAY_CALENDAR',
      priority: 'NORMAL',
      audience: { type: 'ALL', targetIds: [] },
      isPinned: false,
      requiresAck: false,
      status: 'PUBLISHED',
      authorId: userMap['hr@peoplecore.local']._id,
    });

    await Notice.create({
      organizationId: org._id,
      title: 'Engineering Q2 Roadmap & Technical Sprint Goals',
      bodyHtml: sanitizeHtml(
        '<p>Team, our primary focus for this quarter includes platform scalability and modular architecture enhancements. Please coordinate with your engineering leads.</p>'
      ),
      category: 'LEADERSHIP',
      priority: 'NORMAL',
      audience: { type: 'DEPARTMENTS', targetIds: [departmentsMap['ENG']._id] },
      isPinned: false,
      requiresAck: false,
      status: 'PUBLISHED',
      authorId: userMap['executive@peoplecore.local']._id,
    });
    console.log('  + Created 3 Official Company Notices (General, Holiday, and Targeted Engineering notice)');
  }

  console.log('✅ Phase 1, 2, and 3 Master Data & Directory seeded successfully!');
};

if (process.argv[1]?.endsWith('seed.js')) {
  (async () => {
    try {
      await connectDB();
      await seedAll();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('Seeding error:', err);
      process.exit(1);
    }
  })();
}
