import fs from 'node:fs';
import { PDFParse } from 'pdf-parse';
import { HolidayCalendar } from './holidayCalendar.model.js';
import { Holiday } from './holiday.model.js';
import { recordAuditLog } from '../audit/audit.model.js';

/**
 * Holiday & Company Calendar Service
 * Implements multi-format holiday management, draft review, and versioned publishing (Section 4.18)
 */
export class HolidayService {
  /**
   * Retrieves all calendars for the organization
   */
  async getCalendars(orgId) {
    return await HolidayCalendar.find({ organizationId: orgId })
      .populate('createdBy', 'firstName lastName email')
      .populate('publishedBy', 'firstName lastName email')
      .sort({ year: -1, status: 1 });
  }

  /**
   * Retrieves calendar details and all associated holidays
   */
  async getCalendarById(calendarId) {
    const calendar = await HolidayCalendar.findById(calendarId)
      .populate('createdBy', 'firstName lastName email')
      .populate('publishedBy', 'firstName lastName email');

    if (!calendar) {
      throw { statusCode: 404, code: 'CALENDAR_NOT_FOUND', message: 'Holiday calendar not found' };
    }

    const holidays = await Holiday.find({ calendarId, isActive: true }).sort({ localDate: 1 });

    return {
      calendar,
      holidays,
    };
  }

  /**
   * Creates a new draft holiday calendar (never auto-published per Section 4.18)
   */
  async createCalendar(orgId, calendarData, createdByUserId = null) {
    const year = parseInt(calendarData.year, 10) || new Date().getFullYear();
    const startDate = calendarData.startDate || `${year}-01-01`;
    const endDate = calendarData.endDate || `${year}-12-31`;

    const calendar = await HolidayCalendar.create({
      organizationId: orgId,
      name: calendarData.name || `Company Holiday Calendar ${year}`,
      year,
      yearType: calendarData.yearType || 'CALENDAR',
      startDate,
      endDate,
      timezone: calendarData.timezone || 'Asia/Kolkata',
      status: 'DRAFT',
      version: 1,
      sourceDocument: calendarData.sourceDocument || null,
      createdBy: createdByUserId,
    });

    // If initial holidays were parsed from spreadsheet / review list, save them
    if (Array.isArray(calendarData.holidays) && calendarData.holidays.length > 0) {
      const holidayDocs = calendarData.holidays.map((h) => ({
        calendarId: calendar._id,
        localDate: h.localDate || h.date,
        name: h.name,
        type: h.type || 'NATIONAL',
        isPaid: h.isPaid !== false,
        isHalfDay: !!h.isHalfDay,
        scopeType: h.scopeType || 'ALL',
        scopeTargetId: h.scopeTargetId || null,
        description: h.description || '',
      }));
      await Holiday.insertMany(holidayDocs, { ordered: false });
    }

    await recordAuditLog({
      action: 'CALENDAR_DRAFT_CREATED',
      actorId: createdByUserId,
      targetId: calendar._id.toString(),
      metadata: { year, name: calendar.name },
    });

    return await this.getCalendarById(calendar._id);
  }

  /**
   * Adds an individual holiday to a draft or published calendar
   */
  async addHoliday(calendarId, holidayData) {
    const calendar = await HolidayCalendar.findById(calendarId);
    if (!calendar) {
      throw { statusCode: 404, code: 'CALENDAR_NOT_FOUND', message: 'Calendar not found' };
    }

    const localDate = holidayData.localDate || holidayData.date;
    const scopeType = holidayData.scopeType || 'ALL';
    const scopeTargetId = holidayData.scopeTargetId || null;

    // Check duplicate
    const existing = await Holiday.findOne({
      calendarId,
      localDate,
      scopeType,
      scopeTargetId,
    });

    if (existing) {
      throw {
        statusCode: 409,
        code: 'DUPLICATE_HOLIDAY',
        message: `Holiday already exists for date ${localDate} in this scope`,
      };
    }

    const holiday = await Holiday.create({
      calendarId,
      localDate,
      name: holidayData.name,
      type: holidayData.type || 'NATIONAL',
      isPaid: holidayData.isPaid !== false,
      isHalfDay: !!holidayData.isHalfDay,
      scopeType,
      scopeTargetId,
      description: holidayData.description || '',
    });

    return holiday;
  }

  /**
   * Updates an existing holiday
   */
  async updateHoliday(holidayId, updateData) {
    const holiday = await Holiday.findByIdAndUpdate(holidayId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!holiday) {
      throw { statusCode: 404, code: 'HOLIDAY_NOT_FOUND', message: 'Holiday not found' };
    }
    return holiday;
  }

  /**
   * Deletes a holiday from calendar
   */
  async deleteHoliday(holidayId) {
    const holiday = await Holiday.findByIdAndDelete(holidayId);
    if (!holiday) {
      throw { statusCode: 404, code: 'HOLIDAY_NOT_FOUND', message: 'Holiday not found' };
    }
    return { success: true };
  }

  /**
   * Publishes holiday calendar with versioning.
   * Archives any previously published calendar for the same year and organization.
   */
  async publishCalendar(calendarId, publishedByUserId = null) {
    const calendar = await HolidayCalendar.findById(calendarId);
    if (!calendar) {
      throw { statusCode: 404, code: 'CALENDAR_NOT_FOUND', message: 'Calendar not found' };
    }

    // Archive any other published calendar for this year
    await HolidayCalendar.updateMany(
      {
        organizationId: calendar.organizationId,
        year: calendar.year,
        _id: { $ne: calendarId },
        status: 'PUBLISHED',
      },
      { status: 'ARCHIVED' }
    );

    calendar.status = 'PUBLISHED';
    calendar.publishedAt = new Date();
    calendar.publishedBy = publishedByUserId;
    calendar.version = (calendar.version || 1);
    await calendar.save();

    await recordAuditLog({
      action: 'CALENDAR_PUBLISHED',
      actorId: publishedByUserId,
      targetId: calendarId,
      metadata: { year: calendar.year, version: calendar.version },
    });

    return await this.getCalendarById(calendarId);
  }

  /**
   * Retrieves the published company calendar for employees to view
   */
  async getPublishedCompanyCalendar(orgId, year = null) {
    const currentYear = new Date().getFullYear();
    const targetYear = year ? parseInt(year, 10) : currentYear;

    const calendar = await HolidayCalendar.findOne({
      organizationId: orgId,
      year: targetYear,
      status: 'PUBLISHED',
    }).populate('publishedBy', 'firstName lastName');

    const publishedYears = await HolidayCalendar.distinct('year', {
      organizationId: orgId,
      status: 'PUBLISHED',
    });

    const holidays = calendar
      ? await Holiday.find({ calendarId: calendar._id, isActive: true }).sort({ localDate: 1 })
      : [];

    return {
      calendar,
      holidays,
      year: targetYear,
      currentYear,
      publishedYears: publishedYears.sort((a, b) => a - b),
    };
  }

  /**
   * Parses CSV spreadsheet text into reviewable draft rows with confidence scores
   */
  parseCsvSpreadsheet(csvContent) {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw { statusCode: 400, code: 'EMPTY_FILE', message: 'CSV file contains no records' };
    }

    // Header inspection
    const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
    const dateIdx = header.findIndex((h) => h.includes('date'));
    const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('holiday') || h.includes('title'));
    const typeIdx = header.findIndex((h) => h.includes('type'));
    const paidIdx = header.findIndex((h) => h.includes('paid'));

    const parsedRows = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      const rawDate = dateIdx !== -1 ? parts[dateIdx] : parts[0];
      const rawName = nameIdx !== -1 ? parts[nameIdx] : parts[1];
      const rawType = typeIdx !== -1 ? parts[typeIdx] : 'NATIONAL';
      const rawPaid = paidIdx !== -1 ? parts[paidIdx] : 'true';

      if (!rawDate && !rawName) continue;

      let formattedDate = rawDate;
      let valid = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
      let confidence = 0.95;

      // Handle common DD/MM/YYYY or DD-MM-YYYY formats
      if (!valid && rawDate) {
        const partsDate = rawDate.split(/[-/]/);
        if (partsDate.length === 3) {
          if (partsDate[0].length === 4) {
            // YYYY-MM-DD
            formattedDate = `${partsDate[0]}-${partsDate[1].padStart(2, '0')}-${partsDate[2].padStart(2, '0')}`;
            valid = true;
          } else {
            // DD-MM-YYYY
            formattedDate = `${partsDate[2]}-${partsDate[1].padStart(2, '0')}-${partsDate[0].padStart(2, '0')}`;
            valid = true;
            confidence = 0.85;
          }
        }
      }

      parsedRows.push({
        localDate: formattedDate,
        name: rawName || 'Unnamed Holiday',
        type: ['NATIONAL', 'FESTIVAL', 'OPTIONAL', 'COMPANY', 'FLOATER'].includes(rawType.toUpperCase())
          ? rawType.toUpperCase()
          : 'NATIONAL',
        isPaid: rawPaid.toLowerCase() !== 'false' && rawPaid.toLowerCase() !== 'no',
        isHalfDay: false,
        valid,
        confidence,
      });
    }

    return parsedRows;
  }

  /**
   * Extracts holiday items from raw document text (PDF, Word, or plain text)
   * Supports multiple standard date formats:
   * - DD - Month Day Holiday (e.g. 01 - January Thursday New Year Day)
   * - YYYY-MM-DD Day Holiday
   * - DD/MM/YYYY Day Holiday
   * @param {string} text - Raw document text
   * @param {number} [fallbackYear=2026] - Default calendar year
   * @returns {{ detectedYear: number, rows: Array<object> }}
   */
  extractHolidaysFromText(text, fallbackYear = 2026) {
    const MONTH_MAP = {
      january: '01', jan: '01',
      february: '02', feb: '02',
      march: '03', mar: '03',
      april: '04', apr: '04',
      may: '05',
      june: '06', jun: '06',
      july: '07', jul: '07',
      august: '08', aug: '08',
      september: '09', sep: '09', sept: '09',
      october: '10', oct: '10',
      november: '11', nov: '11',
      december: '12', dec: '12',
    };

    let detectedYear = fallbackYear;
    const yearMatch = text.match(/(?:Holiday\s+(?:Calendar|List)\s+|Year\s+|for\s+)(\b20\d{2}\b)/i) || text.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      detectedYear = parseInt(yearMatch[1], 10);
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const rows = [];
    const seenDates = new Set();

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Skip obvious non-data lines (headers, footers, website links)
      if (
        lower.startsWith('date ') ||
        lower.startsWith('holiday calendar') ||
        lower.startsWith('holiday list') ||
        lower.startsWith('www.') ||
        lower.includes('all rights reserved') ||
        lower.includes('page ') ||
        lower.startsWith('-- ') ||
        lower.startsWith('note:')
      ) {
        continue;
      }

      // Pattern 1: DD - MonthName [DayOfWeek] HolidayName (e.g., "01 - January Thursday New Year Day", "15 - Aug Saturday Independence Day")
      const p1 = /^(\d{1,2})\s*[-/]?\s*([A-Za-z]+)\s+(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+)?(.+)$/i;
      const m1 = line.match(p1);
      if (m1) {
        const monthKey = m1[2].toLowerCase();
        if (MONTH_MAP[monthKey]) {
          const day = m1[1].padStart(2, '0');
          const month = MONTH_MAP[monthKey];
          const dateStr = `${detectedYear}-${month}-${day}`;
          const rawName = m1[4].trim();
          const isOptional = rawName.includes('*') || lower.includes('optional') || lower.includes('restricted');
          const cleanName = rawName.replace(/[\*•]+$/, '').trim();

          let type = 'FESTIVAL';
          const nameLower = cleanName.toLowerCase();
          if (
            nameLower.includes('republic') ||
            nameLower.includes('independence') ||
            nameLower.includes('gandhi') ||
            nameLower.includes('ghandhi')
          ) {
            type = 'NATIONAL';
          } else if (isOptional) {
            type = 'OPTIONAL';
          }

          if (!seenDates.has(dateStr + cleanName)) {
            seenDates.add(dateStr + cleanName);
            rows.push({
              localDate: dateStr,
              name: cleanName,
              type,
              isPaid: true,
              isHalfDay: false,
              valid: true,
              confidence: 0.95,
              description: isOptional ? 'Optional / Restricted holiday per company policy' : 'Official company holiday',
            });
          }
          continue;
        }
      }

      // Pattern 2: YYYY-MM-DD [DayOfWeek] HolidayName
      const p2 = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+)?(.+)$/i;
      const m2 = line.match(p2);
      if (m2) {
        const dateStr = `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
        const name = m2[5].trim();
        if (!seenDates.has(dateStr + name)) {
          seenDates.add(dateStr + name);
          rows.push({
            localDate: dateStr,
            name,
            type: 'NATIONAL',
            isPaid: true,
            isHalfDay: false,
            valid: true,
            confidence: 0.9,
            description: 'Official company holiday',
          });
        }
        continue;
      }

      // Pattern 3: DD/MM/YYYY or DD-MM-YYYY [DayOfWeek] HolidayName
      const p3 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+)?(.+)$/i;
      const m3 = line.match(p3);
      if (m3) {
        const dateStr = `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;
        const name = m3[5].trim();
        if (!seenDates.has(dateStr + name)) {
          seenDates.add(dateStr + name);
          rows.push({
            localDate: dateStr,
            name,
            type: 'NATIONAL',
            isPaid: true,
            isHalfDay: false,
            valid: true,
            confidence: 0.9,
            description: 'Official company holiday',
          });
        }
        continue;
      }
    }

    return { detectedYear, rows };
  }

  /**
   * Universal document analyzer: handles PDF, CSV, TXT, Excel/Word uploads
   * @param {string} filePath - Absolute path to uploaded file on disk
   * @param {string} originalName - Original filename from client
   * @param {string} mimeType - Upload MIME type
   * @returns {Promise<{ detectedYear: number, rows: Array<object> }>}
   */
  async parseDocumentFile(filePath, originalName, mimeType) {
    const lower = originalName.toLowerCase();

    // If CSV or spreadsheet text
    if (lower.endsWith('.csv') || lower.endsWith('.txt') || mimeType?.includes('csv') || mimeType?.includes('text')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(',') && content.split('\n')[0].includes(',')) {
        const rows = this.parseCsvSpreadsheet(content);
        return { detectedYear: 2026, rows };
      }
      return this.extractHolidaysFromText(content);
    }

    // If PDF Document
    if (lower.endsWith('.pdf') || mimeType?.includes('pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: dataBuffer });
      try {
        const textResult = await parser.getText();
        const extracted = this.extractHolidaysFromText(textResult.text || '');
        return extracted;
      } finally {
        await parser.destroy().catch(() => {});
      }
    }

    // Fallback for other file types
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      return this.extractHolidaysFromText(raw);
    } catch {
      return { detectedYear: 2026, rows: [] };
    }
  }
}

export const holidayService = new HolidayService();
