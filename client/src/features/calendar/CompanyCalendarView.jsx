import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  Calendar as CalendarIcon,
  Upload,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
  Trash2,
  Edit2,
  ChevronDown,
} from 'lucide-react';

export const CompanyCalendarView = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN') || hasRole('HR_EXECUTIVE');
  const canPublish = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN');

  const currentYear = new Date().getFullYear() || 2026;
  // Dynamic list spanning previous 7 years through upcoming 2 years (e.g. 2019 - 2028)
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + 2 - i);

  const [calendar, setCalendar] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [publishedYears, setPublishedYears] = useState([2026]);

  // Edit / Delete Holiday States (When plans change)
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [deletingHoliday, setDeletingHoliday] = useState(null);

  // Import Wizard Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [wizardYear, setWizardYear] = useState(currentYear);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'text'
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [csvInput, setCsvInput] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [importStep, setImportStep] = useState(1); // 1: Input, 2: Review, 3: Success
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);

  // Add Single Holiday Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    localDate: '',
    name: '',
    type: 'NATIONAL',
    isPaid: true,
    description: '',
  });

  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchCalendar = async (year = selectedYear) => {
    try {
      setLoading(true);
      const res = await api.get(`/holidays/company?year=${year}`);
      setCalendar(res.data.data.calendar);
      setHolidays(res.data.data.holidays || []);
      if (Array.isArray(res.data.data.publishedYears)) {
        setPublishedYears(res.data.data.publishedYears);
      }
    } catch (err) {
      console.error('Failed to load company calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(selectedYear);
  }, [selectedYear]);

  // Clean reset & open modal to Step 1
  const openImportWizard = (yearToUse = selectedYear) => {
    setWizardYear(yearToUse || selectedYear);
    setImportStep(1);
    setSelectedFile(null);
    setUploadedDoc(null);
    setCsvInput('');
    setParsedRows([]);
    setImportError(null);
    setShowImportModal(true);
  };

  // Clean reset & close modal
  const closeImportWizard = () => {
    setShowImportModal(false);
    setImportStep(1);
    setSelectedFile(null);
    setUploadedDoc(null);
    setCsvInput('');
    setParsedRows([]);
    setImportError(null);
  };

  // Row update in review step
  const handleUpdateRow = (index, field, value) => {
    setParsedRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'localDate') {
        updated[index].valid = /^\d{4}-\d{2}-\d{2}$/.test(value);
      }
      return updated;
    });
  };

  // Remove row in review step
  const handleDeleteRow = (index) => {
    setParsedRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Add new row in review step
  const handleAddRow = () => {
    setParsedRows((prev) => [
      ...prev,
      {
        localDate: `${calendar?.year || 2026}-01-01`,
        name: 'New Holiday',
        type: 'FESTIVAL',
        isPaid: true,
        isHalfDay: false,
        valid: true,
        confidence: 1.0,
      },
    ]);
  };

  // Handle Device File Upload
  const handleFileUpload = async () => {
    if (!selectedFile) {
      setImportError('Please select a file from your device first');
      return;
    }
    setImportLoading(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.post('/holidays/calendars/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadedDoc(res.data.data.sourceDocument);
      if (res.data.data.detectedYear) {
        setWizardYear(res.data.data.detectedYear);
      }
      setParsedRows(res.data.data.rows || []);
      setImportStep(2);
    } catch (err) {
      setImportError(err.message || 'Failed to upload and analyze file from device');
    } finally {
      setImportLoading(false);
    }
  };

  const handleParseCsv = async () => {
    if (!csvInput.trim()) {
      setImportError('Please paste CSV spreadsheet content');
      return;
    }
    setImportLoading(true);
    setImportError(null);

    try {
      const res = await api.post('/holidays/calendars/parse-csv', { csvContent: csvInput });
      setParsedRows(res.data.data.rows || []);
      setUploadedDoc(null);
      setImportStep(2);
    } catch (err) {
      setImportError(err.message || 'Failed to parse CSV spreadsheet');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    setImportLoading(true);
    setImportError(null);

    try {
      // 1. Create Draft Calendar with parsed rows and attached source document
      const draftRes = await api.post('/holidays/calendars', {
        name: `Company Holiday Calendar ${wizardYear}`,
        year: wizardYear,
        holidays: parsedRows.filter((r) => r.valid),
        sourceDocument: uploadedDoc || null,
      });

      const draftId = draftRes.data.data.calendar._id;

      // 2. If user has publish privilege, auto-publish
      if (canPublish) {
        await api.post(`/holidays/calendars/${draftId}/publish`);
      }

      setImportStep(3);
      setSelectedYear(wizardYear);
      fetchCalendar(wizardYear);
    } catch (err) {
      setImportError(err.message || 'Failed to import calendar');
    } finally {
      setImportLoading(false);
    }
  };

  const handleAddSingleHoliday = async (e) => {
    e.preventDefault();
    try {
      if (!calendar?._id) return;
      await api.post(`/holidays/calendars/${calendar._id}/holidays`, newHoliday);
      setShowAddModal(false);
      setNewHoliday({ localDate: '', name: '', type: 'NATIONAL', isPaid: true, description: '' });
      setActionSuccess('Holiday added successfully to company calendar');
      fetchCalendar(selectedYear);
    } catch (err) {
      alert(err.message || 'Failed to add holiday');
    }
  };

  const handleUpdateExistingHoliday = async (e) => {
    e.preventDefault();
    if (!calendar?._id || !editingHoliday?._id) return;
    try {
      await api.patch(`/holidays/calendars/${calendar._id}/holidays/${editingHoliday._id}`, {
        localDate: editingHoliday.localDate,
        name: editingHoliday.name,
        type: editingHoliday.type,
        description: editingHoliday.description,
        isPaid: editingHoliday.isPaid !== false,
      });
      setActionSuccess(`Holiday "${editingHoliday.name}" updated successfully.`);
      setEditingHoliday(null);
      fetchCalendar(selectedYear);
    } catch (err) {
      alert(err.message || 'Failed to update holiday');
    }
  };

  const handleDeleteExistingHoliday = async () => {
    if (!calendar?._id || !deletingHoliday?._id) return;
    try {
      await api.delete(`/holidays/calendars/${calendar._id}/holidays/${deletingHoliday._id}`);
      setActionSuccess(`Holiday "${deletingHoliday.name}" removed from calendar.`);
      setDeletingHoliday(null);
      fetchCalendar(selectedYear);
    } catch (err) {
      alert(err.message || 'Failed to delete holiday');
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/v1/holidays/template', '_blank');
  };

  const filteredHolidays = holidays.filter((h) => {
    if (selectedType === 'ALL') return true;
    return h.type === selectedType;
  });

  const getHolidayTypeBadge = (type) => {
    switch (type) {
      case 'NATIONAL':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FESTIVAL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OPTIONAL':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Company Holiday Calendar</h2>
            {calendar && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Published v{calendar.version}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official company holiday dates feeding attendance, leave, and shift schedules
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            CSV Template
          </button>

          {canManage && (
            <>
              <button
                onClick={() => openImportWizard(selectedYear)}
                className="inline-flex items-center px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-100 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import / Upload ({selectedYear})
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Holiday
              </button>
            </>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Year Switcher Bar with Dropdown & Status */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <label htmlFor="calendar-year-select" className="text-xs font-bold text-slate-600 flex items-center shrink-0">
            <CalendarIcon className="w-4 h-4 mr-1.5 text-indigo-600" />
            Calendar Year:
          </label>
          <div className="relative inline-block">
            <select
              id="calendar-year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-slate-900 text-xs rounded-xl pl-3 pr-8 py-2 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {yearOptions.map((y) => {
                const isCurrent = y === currentYear;
                const isPublished = publishedYears.includes(y);
                return (
                  <option key={y} value={y}>
                    {y} {isCurrent ? '• Current Year' : isPublished ? '• Published' : ''}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedYear === currentYear ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              Active Current Year
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedYear(currentYear)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
            >
              Back to Current Year ({currentYear})
            </button>
          )}
        </div>

        {/* Status of Selected Year */}
        <div className="flex items-center space-x-2 text-xs">
          {calendar ? (
            <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-xs">
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
              Published v{calendar.version} • {holidays.length} Holidays
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-medium text-xs">
              <AlertCircle className="w-4 h-4 mr-1.5 text-amber-600" />
              Not Published for {selectedYear}
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs">
        {['ALL', 'NATIONAL', 'FESTIVAL', 'OPTIONAL', 'COMPANY'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              selectedType === type
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {type === 'ALL' ? 'All Holidays' : type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Holiday Grid / Empty States */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          Loading company calendar for {selectedYear}...
        </div>
      ) : !calendar ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-md mx-auto shadow-xs my-6">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            No Holiday Calendar for {selectedYear}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {canManage
              ? `There is no official holiday calendar published for ${selectedYear} yet. You can upload an official PDF or spreadsheet to announce it.`
              : `The official company holiday calendar for ${selectedYear} has not been published yet. HR will announce it soon.`}
          </p>

          {canManage && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => openImportWizard(selectedYear)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Import / Publish for {selectedYear}
              </button>
            </div>
          )}
        </div>
      ) : filteredHolidays.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No holidays found in this category</p>
          <p className="text-xs text-slate-500 mt-1">
            No {selectedType.toLowerCase()} holidays found for {selectedYear}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHolidays.map((h) => {
            const dateObj = new Date(h.localDate);
            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const dayNum = dateObj.getDate();
            const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

            return (
              <div
                key={h._id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex items-start space-x-4"
              >
                {/* Date Badge */}
                <div className="w-14 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-indigo-600">{monthStr}</span>
                  <span className="text-xl font-black text-indigo-900 leading-none mt-0.5">{dayNum}</span>
                </div>

                {/* Holiday Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getHolidayTypeBadge(h.type)}`}>
                      {h.type}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">{weekdayStr}</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-1.5 truncate">{h.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {h.description || 'Full day company holiday'}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="inline-flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-emerald-500" />
                      {h.isPaid ? 'Paid Day Off' : 'Unpaid'}
                    </span>

                    {canManage && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setEditingHoliday({ ...h })}
                          className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit Holiday Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingHoliday(h)}
                          className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Holiday"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import / Upload Wizard Modal (Section 4.18) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Holiday Calendar Import Wizard
                  </h3>
                  <p className="text-xs text-slate-500">
                    {importStep === 1 && 'Step 1 of 2: Upload or paste spreadsheet data'}
                    {importStep === 2 && 'Step 2 of 2: Human-in-the-loop review before publishing'}
                    {importStep === 3 && 'Import Completed'}
                  </p>
                </div>
              </div>
              <button onClick={closeImportWizard} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{importError}</span>
              </div>
            )}

            {importStep === 1 && (
              <div className="mt-4 space-y-4 text-xs">
                {/* Target Calendar Year Selector */}
                <div className="flex items-center justify-between p-3 bg-indigo-50/70 rounded-xl border border-indigo-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-800">Target Calendar Year:</span>
                    <select
                      value={wizardYear}
                      onChange={(e) => setWizardYear(Number(e.target.value))}
                      className="bg-white border border-indigo-300 text-indigo-900 font-bold px-3 py-1 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>
                          {y} {y === currentYear ? '(Current Year)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Calendar and all holidays will be published for <strong>{wizardYear}</strong>
                  </span>
                </div>

                {/* Method Selector Tabs */}
                <div className="flex border-b border-slate-200 space-x-4 pb-2">
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`font-semibold pb-1 border-b-2 transition-colors flex items-center ${
                      uploadMode === 'file'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload from Device Storage (CSV, XLSX, PDF, DOCX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('text')}
                    className={`font-semibold pb-1 border-b-2 transition-colors flex items-center ${
                      uploadMode === 'text'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Paste CSV Text Manually
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <div className="space-y-3">
                    <p className="text-slate-600">
                      Select your official company holiday file from your computer or device. The system will detect the format, extract the holiday dates, and let you review them before publishing.
                    </p>

                    {/* Drag & Drop File Zone */}
                    <div
                      onClick={() => document.getElementById('holiday-device-file-input').click()}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-6 text-center cursor-pointer transition-all"
                    >
                      <input
                        id="holiday-device-file-input"
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf,.docx,.doc,.txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                            setImportError(null);
                          }
                        }}
                      />

                      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                        <Upload className="w-6 h-6" />
                      </div>

                      {selectedFile ? (
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{selectedFile.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready to analyze
                          </p>
                          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                            Click to change file
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Click to browse or drop file here</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Supported: CSV, Excel (.xlsx), PDF, Word (.docx), or Text
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Maximum file size: 10 MB</p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="text-xs text-indigo-600 hover:underline flex items-center"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download sample CSV template
                      </button>

                      <button
                        type="button"
                        onClick={handleFileUpload}
                        disabled={importLoading || !selectedFile}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                      >
                        {importLoading ? 'Reading & Analyzing...' : 'Upload & Proceed to Review'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-600">
                      Paste CSV holiday rows below (format: <code className="bg-slate-100 px-1 py-0.5 rounded">Date, Holiday Name, Type, Is Paid</code>).
                    </p>

                    <textarea
                      rows={6}
                      value={csvInput}
                      onChange={(e) => setCsvInput(e.target.value)}
                      placeholder={`2026-01-26,Republic Day,NATIONAL,true\n2026-03-04,Holi,FESTIVAL,true`}
                      className="w-full font-mono text-xs p-3 border border-slate-300 rounded-xl"
                    />

                    <div className="flex justify-between items-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCsvInput(`Date,Holiday Name,Type,Is Paid
2026-01-26,Republic Day,NATIONAL,true
2026-03-04,Holi,FESTIVAL,true
2026-08-15,Independence Day,NATIONAL,true
2026-10-02,Mahatma Gandhi Jayanti,NATIONAL,true
2026-11-08,Diwali,FESTIVAL,true
2026-12-25,Christmas,FESTIVAL,true`);
                        }}
                        className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded"
                      >
                        Load Sample Rows
                      </button>

                      <button
                        type="button"
                        onClick={handleParseCsv}
                        disabled={importLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                      >
                        {importLoading ? 'Detecting & Parsing...' : 'Parse & Review Rows'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {importStep === 2 && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 flex items-start justify-between">
                  <div>
                    <p className="font-bold flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-600" />
                      Human Review Step (Section 4.18 Mandate)
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Extracted {parsedRows.length} holiday records from {uploadedDoc ? uploadedDoc.originalName : 'spreadsheet'}. Review, edit names or dates, or remove unwanted items before publishing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg text-amber-900 font-semibold shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Row
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Date (YYYY-MM-DD)</th>
                        <th className="px-3 py-2 text-left">Holiday Name</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No rows extracted. Click "Add Row" to enter holidays manually or go back to upload again.
                          </td>
                        </tr>
                      ) : (
                        parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5">
                              <input
                                type="date"
                                value={r.localDate}
                                onChange={(e) => handleUpdateRow(i, 'localDate', e.target.value)}
                                className="w-32 px-2 py-1 font-mono text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={r.name}
                                onChange={(e) => handleUpdateRow(i, 'name', e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <select
                                value={r.type}
                                onChange={(e) => handleUpdateRow(i, 'type', e.target.value)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                              >
                                <option value="NATIONAL">NATIONAL</option>
                                <option value="FESTIVAL">FESTIVAL</option>
                                <option value="OPTIONAL">OPTIONAL</option>
                                <option value="COMPANY">COMPANY</option>
                              </select>
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {r.valid ? (
                                <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-red-500 font-semibold text-[11px]">
                                  <AlertCircle className="w-3.5 h-3.5 mr-1" /> Invalid
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(i)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Remove row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                  >
                    Back to Upload
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importLoading || parsedRows.filter((r) => r.valid).length === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                  >
                    {importLoading ? 'Publishing...' : `Confirm & Publish (${parsedRows.filter((r) => r.valid).length} Holidays)`}
                  </button>
                </div>
              </div>
            )}

            {importStep === 3 && (
              <div className="mt-4 py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Calendar Published Successfully</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  The company calendar has been published with versioning and is now live for all employees.
                </p>
                <button
                  onClick={closeImportWizard}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Close Wizard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Single Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Add Holiday to Calendar</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSingleHoliday} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newHoliday.localDate}
                  onChange={(e) => setNewHoliday({ ...newHoliday, localDate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  placeholder="e.g. Guru Nanak Jayanti"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category / Type</label>
                <select
                  value={newHoliday.type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="NATIONAL">National Holiday</option>
                  <option value="FESTIVAL">Festival Holiday</option>
                  <option value="OPTIONAL">Optional / Restricted</option>
                  <option value="COMPANY">Company Celebration</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  placeholder="Official paid day off"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {editingHoliday && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Holiday Details</h3>
              </div>
              <button onClick={() => setEditingHoliday(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExistingHoliday} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={editingHoliday.localDate}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, localDate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Holiday Name *</label>
                <input
                  type="text"
                  required
                  value={editingHoliday.name}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category / Type</label>
                <select
                  value={editingHoliday.type}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, type: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  <option value="NATIONAL">National Holiday</option>
                  <option value="FESTIVAL">Festival Holiday</option>
                  <option value="OPTIONAL">Optional / Restricted</option>
                  <option value="COMPANY">Company Celebration</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={editingHoliday.description || ''}
                  onChange={(e) => setEditingHoliday({ ...editingHoliday, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingHoliday(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingHoliday && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Remove Holiday?</h4>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove <strong className="text-slate-800">"{deletingHoliday.name}"</strong> ({deletingHoliday.localDate}) from the published calendar?
            </p>

            <div className="flex justify-center space-x-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingHoliday(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Holiday
              </button>
              <button
                type="button"
                onClick={handleDeleteExistingHoliday}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
