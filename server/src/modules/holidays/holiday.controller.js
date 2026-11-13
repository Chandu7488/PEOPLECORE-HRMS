import fs from 'node:fs';
import { holidayService } from './holiday.service.js';
import { organizationService } from '../organization/organization.service.js';

export const getCalendarsController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const calendars = await holidayService.getCalendars(org._id);
    res.status(200).json({
      success: true,
      data: calendars,
      message: 'Calendars retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getCalendarByIdController = async (req, res, next) => {
  try {
    const result = await holidayService.getCalendarById(req.params.id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Calendar details retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const createCalendarController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await holidayService.createCalendar(org._id, req.body, req.user?._id);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Draft holiday calendar created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const parseCsvController = (req, res, next) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMPTY_CONTENT', message: 'CSV content is required' },
      });
    }

    const rows = holidayService.parseCsvSpreadsheet(csvContent);
    res.status(200).json({
      success: true,
      data: {
        rows,
        total: rows.length,
        validCount: rows.filter((r) => r.valid).length,
      },
      message: 'CSV parsed for review successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const uploadSourceFileController = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'FILE_MISSING', message: 'No file was uploaded from your device' },
      });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;
    const lowerName = originalname.toLowerCase();
    const sourceDocument = {
      fileName: filename,
      originalName: originalname,
      mimeType: mimetype,
      size,
      path: filePath,
    };

    const { detectedYear, rows: parsedRows } = await holidayService.parseDocumentFile(
      filePath,
      originalname,
      mimetype
    );

    res.status(200).json({
      success: true,
      data: {
        sourceDocument,
        detectedYear: detectedYear || 2026,
        rows: parsedRows,
        total: parsedRows.length,
        validCount: parsedRows.filter((r) => r.valid).length,
        isSpreadsheet: lowerName.endsWith('.csv') || lowerName.endsWith('.txt'),
      },
      message: `File '${originalname}' uploaded and analyzed successfully. Found ${parsedRows.length} holiday records.`,
    });
  } catch (err) {
    next(err);
  }
};

export const addHolidayController = async (req, res, next) => {
  try {
    const holiday = await holidayService.addHoliday(req.params.id, req.body);
    res.status(201).json({
      success: true,
      data: holiday,
      message: 'Holiday added successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const updateHolidayController = async (req, res, next) => {
  try {
    const holiday = await holidayService.updateHoliday(req.params.hid, req.body);
    res.status(200).json({
      success: true,
      data: holiday,
      message: 'Holiday updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const deleteHolidayController = async (req, res, next) => {
  try {
    await holidayService.deleteHoliday(req.params.hid);
    res.status(200).json({
      success: true,
      data: null,
      message: 'Holiday removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const publishCalendarController = async (req, res, next) => {
  try {
    const result = await holidayService.publishCalendar(req.params.id, req.user?._id);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Holiday calendar published successfully and versioned',
    });
  } catch (err) {
    next(err);
  }
};

export const getCompanyCalendarController = async (req, res, next) => {
  try {
    const org = await organizationService.getOrCreatePrimaryOrganization();
    const result = await holidayService.getPublishedCompanyCalendar(org._id, req.query.year);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Company calendar retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const getTemplateController = (req, res) => {
  const sampleCsv = `Date,Holiday Name,Type,Is Paid,Description
2026-01-26,Republic Day,NATIONAL,true,National Holiday
2026-03-04,Holi,FESTIVAL,true,Festival of Colors
2026-08-15,Independence Day,NATIONAL,true,National Holiday
2026-10-02,Mahatma Gandhi Jayanti,NATIONAL,true,National Holiday
2026-10-20,Dussehra,FESTIVAL,true,Vijayadashami
2026-11-08,Diwali,FESTIVAL,true,Festival of Lights
2026-12-25,Christmas,FESTIVAL,true,Christmas Day`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="holiday_template.csv"');
  res.status(200).send(sampleCsv);
};
