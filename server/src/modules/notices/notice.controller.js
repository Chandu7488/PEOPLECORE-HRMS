import { noticeService } from './notice.service.js';
import { organizationService } from '../organization/organization.service.js';
import { Employee } from '../employees/employee.model.js';

export const getNoticesController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const employee = req.user.employeeId ? await Employee.findById(req.user.employeeId) : null;
    const notices = await noticeService.getNoticesForUser(org._id, req.user, employee);

    res.status(200).json({
      success: true,
      data: notices,
      message: 'Notices retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getNoticeByIdController = async (req, res, next) => {
  try {
    const employee = req.user.employeeId ? await Employee.findById(req.user.employeeId) : null;
    const notice = await noticeService.getNoticeById(req.params.id, req.user, employee);

    res.status(200).json({
      success: true,
      data: notice,
      message: 'Notice retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createNoticeController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const notice = await noticeService.createNotice(org._id, req.user, req.body);

    res.status(201).json({
      success: true,
      data: notice,
      message: 'Notice posted successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateNoticeController = async (req, res, next) => {
  try {
    const notice = await noticeService.updateNotice(req.params.id, req.body, req.user);

    res.status(200).json({
      success: true,
      data: notice,
      message: 'Notice updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const acknowledgeNoticeController = async (req, res, next) => {
  try {
    if (!req.user.employeeId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_EMPLOYEE_LINK', message: 'User is not linked to an employee profile' },
      });
    }

    const receipt = await noticeService.acknowledgeNotice(req.params.id, req.user.employeeId);

    res.status(200).json({
      success: true,
      data: receipt,
      message: 'Notice acknowledged successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getAcknowledgementReportController = async (req, res, next) => {
  try {
    const report = await noticeService.getAcknowledgementReport(req.params.id, req.user);

    res.status(200).json({
      success: true,
      data: report,
      message: 'Acknowledgement report generated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const addCommentController = async (req, res, next) => {
  try {
    if (!req.user.employeeId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_EMPLOYEE_LINK', message: 'User is not linked to an employee profile' },
      });
    }

    const comment = await noticeService.addComment(req.params.id, req.user.employeeId, req.body.text);

    res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment added successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getCommentsController = async (req, res, next) => {
  try {
    const comments = await noticeService.getComments(req.params.id);

    res.status(200).json({
      success: true,
      data: comments,
      message: 'Comments retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};
