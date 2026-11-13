import { Employee } from './employee.model.js';
import { employeeService } from './employee.service.js';
import { organizationService } from '../organization/organization.service.js';

export const getEmployeesController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();

    const isPrivileged = req.user?.roles?.some((r) =>
      ['SUPER_ADMIN', 'HR_ADMIN', 'HR_EXECUTIVE', 'MANAGER', 'EXECUTIVE', 'PAYROLL_ADMIN'].includes(r)
    );

    const query = { ...req.query };
    // If regular employee, strictly restrict list to own profile
    if (!isPrivileged) {
      query.userId = req.user?._id;
      query.userEmail = req.user?.email;
    }

    const result = await employeeService.getEmployees(org._id, query);

    res.status(200).json({
      success: true,
      data: result.employees,
      meta: {
        pagination: result.pagination,
      },
      message: 'Employees retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeByIdController = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee not found' } });
    }

    const isPrivileged = req.user?.roles?.some((r) =>
      ['SUPER_ADMIN', 'HR_ADMIN', 'HR_EXECUTIVE', 'MANAGER', 'EXECUTIVE', 'PAYROLL_ADMIN'].includes(r)
    );

    // Regular employee can ONLY view their own profile
    const isOwn =
      (employee.userId && employee.userId.toString() === req.user?._id?.toString()) ||
      (employee.workEmail && employee.workEmail.toLowerCase() === req.user?.email?.toLowerCase());

    if (!isPrivileged && !isOwn) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: Employees can only view their own profile information.' },
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee details retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createEmployeeController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await employeeService.createEmployee(org._id, req.body, req.user?._id);

    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateEmployeeController = async (req, res, next) => {
  try {
    const employee = await employeeService.updateEmployee(req.params.id, req.body, req.user?._id);

    res.status(200).json({
      success: true,
      data: employee,
      message: 'Employee updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const transferEmployeeController = async (req, res, next) => {
  try {
    const result = await employeeService.transferEmployee(req.params.id, req.body, req.user?._id);

    res.status(200).json({
      success: true,
      data: result,
      message: `Employee ${req.body.changeType || 'transfer'} recorded successfully`,
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeJobHistoryController = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee not found' } });
    }

    const isPrivileged = req.user?.roles?.some((r) =>
      ['SUPER_ADMIN', 'HR_ADMIN', 'HR_EXECUTIVE', 'MANAGER', 'EXECUTIVE', 'PAYROLL_ADMIN'].includes(r)
    );

    if (!isPrivileged && employee.userId?.toString() !== req.user?._id?.toString()) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: You can only view your own job history.' },
      });
    }

    const history = await employeeService.getEmployeeJobHistory(req.params.id);

    res.status(200).json({
      success: true,
      data: history,
      message: 'Employee job history retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const resendEmployeeInviteController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await employeeService.resendEmployeeInvitation(org._id, req.params.id, req.user._id);

    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployee360ProfileController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await employeeService.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee not found' } });
    }

    const isPrivileged = req.user?.roles?.some((r) =>
      ['SUPER_ADMIN', 'HR_ADMIN', 'HR_EXECUTIVE', 'MANAGER', 'EXECUTIVE', 'PAYROLL_ADMIN'].includes(r)
    );

    const isOwn =
      (employee.userId && employee.userId.toString() === req.user?._id?.toString()) ||
      (employee.workEmail && employee.workEmail.toLowerCase() === req.user?.email?.toLowerCase());

    if (!isPrivileged && !isOwn) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: You can only view your own 360 profile.' },
      });
    }

    const result = await employeeService.getEmployee360Profile(req.params.id, org._id);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Comprehensive 360 employee intelligence profile retrieved',
    });
  } catch (err) {
    next(err);
  }
};

export const getMy360ProfileController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = await Employee.findOne({
      $or: [{ userId: req.user?._id }, { workEmail: req.user?.email?.toLowerCase() }],
    });

    if (!employee) {
      return res.status(404).json({ success: false, error: { message: 'Employee profile not found' } });
    }

    const result = await employeeService.getEmployee360Profile(employee._id, org._id);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Personal 360 profile retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const recordAdminLeaveController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await employeeService.recordAdminLeave(org._id, req.params.id, req.body, req.user._id);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Leave successfully recorded and debited on employee profile',
    });
  } catch (err) {
    next(err);
  }
};

export const addEmployeeDocumentController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await employeeService.addEmployeeDocument(
      org._id,
      req.params.id,
      { ...req.body, file: req.file },
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Document successfully uploaded to employee record',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteEmployeeDocumentController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await employeeService.deleteEmployeeDocument(org._id, req.params.id, req.params.docId, req.user._id);

    res.status(200).json({
      success: true,
      data: result,
      message: 'Document removed from employee profile',
    });
  } catch (err) {
    next(err);
  }
};
