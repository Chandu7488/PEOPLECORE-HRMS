import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  LogIn,
  LogOut,
  MapPin,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Check,
  Building,
  Laptop,
  Home,
} from 'lucide-react';

export const AttendancePortalView = () => {
  const { user, hasRole } = useAuth();
  const isHrOrAdmin = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN');

  const [activeTab, setActiveTab] = useState('timesheet'); // 'timesheet' | 'schedules'
  const [todayData, setTodayData] = useState(null);
  const [timesheet, setTimesheet] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Shift Modal State (Admin)
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    halfDayMinutes: 240,
    fullDayMinutes: 480,
    breakMinutes: 60,
    workMode: 'OFFICE',
    workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    isDefault: false,
  });
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftError, setShiftError] = useState(null);

  const allWeekDays = [
    { id: 'MONDAY', label: 'Mon' },
    { id: 'TUESDAY', label: 'Tue' },
    { id: 'WEDNESDAY', label: 'Wed' },
    { id: 'THURSDAY', label: 'Thu' },
    { id: 'FRIDAY', label: 'Fri' },
    { id: 'SATURDAY', label: 'Sat' },
    { id: 'SUNDAY', label: 'Sun' },
  ];

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [todayRes, monthRes, shiftRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get(`/attendance/me?year=${new Date().getFullYear()}`),
        api.get('/attendance/shifts'),
      ]);
      setTodayData(todayRes.data.data);
      setTimesheet(monthRes.data.data);
      setShifts(shiftRes.data.data || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handlePunch = async (type) => {
    setPunchLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await api.post('/attendance/punches', {
        type,
        location: 'Web Clock In/Out Widget',
        idempotencyKey: `punch-${user._id}-${Date.now()}`,
      });
      setActionSuccess(res.data.message);
      fetchAttendance();
    } catch (err) {
      setActionError(err.message || 'Failed to record punch');
    } finally {
      setPunchLoading(false);
    }
  };

  // Open Shift Modal for Add
  const handleOpenAddShift = () => {
    setEditingShiftId(null);
    setShiftForm({
      code: '',
      name: '',
      startTime: '09:30',
      endTime: '18:30',
      graceMinutes: 15,
      halfDayMinutes: 240,
      fullDayMinutes: 480,
      breakMinutes: 60,
      workMode: 'OFFICE',
      workDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      isDefault: false,
    });
    setShiftError(null);
    setShowShiftModal(true);
  };

  // Open Shift Modal for Edit
  const handleOpenEditShift = (s) => {
    setEditingShiftId(s._id);
    setShiftForm({
      code: s.code,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      graceMinutes: s.graceMinutes,
      halfDayMinutes: s.halfDayMinutes,
      fullDayMinutes: s.fullDayMinutes,
      breakMinutes: s.breakMinutes || 60,
      workMode: s.workMode || 'OFFICE',
      workDays: s.workDays || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      isDefault: s.isDefault || false,
    });
    setShiftError(null);
    setShowShiftModal(true);
  };

  const toggleWorkDay = (dayId) => {
    if (shiftForm.workDays.includes(dayId)) {
      if (shiftForm.workDays.length === 1) {
        alert('A work schedule must have at least one working day.');
        return;
      }
      setShiftForm({ ...shiftForm, workDays: shiftForm.workDays.filter((d) => d !== dayId) });
    } else {
      setShiftForm({ ...shiftForm, workDays: [...shiftForm.workDays, dayId] });
    }
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    setShiftLoading(true);
    setShiftError(null);

    try {
      if (editingShiftId) {
        await api.put(`/attendance/shifts/${editingShiftId}`, shiftForm);
        setActionSuccess(`Work schedule "${shiftForm.name}" updated successfully.`);
      } else {
        await api.post('/attendance/shifts', shiftForm);
        setActionSuccess(`Work schedule "${shiftForm.name}" created successfully.`);
      }
      setShowShiftModal(false);
      fetchAttendance();
    } catch (err) {
      setShiftError(err.response?.data?.error?.message || err.message || 'Failed to save shift');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleSetDefaultShift = async (shiftId, shiftName) => {
    try {
      await api.post(`/attendance/shifts/${shiftId}/set-default`);
      setActionSuccess(`"${shiftName}" set as company default work schedule.`);
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to set default shift');
    }
  };

  const handleDeleteShift = async (shiftId, shiftName) => {
    if (!window.confirm(`Are you sure you want to delete shift "${shiftName}"?`)) return;
    try {
      await api.delete(`/attendance/shifts/${shiftId}`);
      setActionSuccess(`Shift "${shiftName}" deleted.`);
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete shift');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LATE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HALF_DAY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HOLIDAY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'WEEKLY_OFF':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'LEAVE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ABSENT':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance & Work Schedules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time web check-in/out, configurable office timings, 5-day / 6-day work weeks & hybrid modes
          </p>
        </div>

        {isHrOrAdmin && (
          <button
            onClick={handleOpenAddShift}
            className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Work Schedule
          </button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold text-emerald-600">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="font-bold text-red-600">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('timesheet')}
          className={`pb-3 px-3 border-b-2 transition-colors flex items-center ${
            activeTab === 'timesheet'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5" />
          My Attendance & Timesheet
        </button>

        {isHrOrAdmin && (
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'schedules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5" />
            Work Schedules & Office Timings ({shifts.length})
          </button>
        )}
      </div>

      {/* TAB 1: MY ATTENDANCE & WEB CLOCK */}
      {activeTab === 'timesheet' && (
        <div className="space-y-6">
          {/* Hero: Web Clock-In Widget */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-800/60 border border-indigo-600/40 text-[11px] font-semibold text-indigo-200">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Current Shift: {todayData?.shift?.name || 'General Shift'} ({todayData?.shift?.startTime || '09:00'} - {todayData?.shift?.endTime || '18:00'})
                </span>
              </div>

              <h3 className="text-2xl font-bold tracking-tight">Daily Attendance Tracker</h3>
              <p className="text-xs text-indigo-200 max-w-md">
                Clock in when you start your working day and clock out when leaving. Idempotent punch events derive your daily status automatically.
              </p>

              <div className="flex items-center justify-center md:justify-start space-x-4 pt-2 text-xs">
                <div>
                  <span className="text-indigo-300">First In:</span>{' '}
                  <strong className="text-white font-mono">
                    {todayData?.attendance?.firstIn ? new Date(todayData.attendance.firstIn).toLocaleTimeString() : '--:--'}
                  </strong>
                </div>
                <div>
                  <span className="text-indigo-300">Last Out:</span>{' '}
                  <strong className="text-white font-mono">
                    {todayData?.attendance?.lastOut ? new Date(todayData.attendance.lastOut).toLocaleTimeString() : '--:--'}
                  </strong>
                </div>
                <div>
                  <span className="text-indigo-300">Today:</span>{' '}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 border border-white/20">
                    {todayData?.attendance?.status || 'NOT_CLOCKED_YET'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => handlePunch('IN')}
                disabled={punchLoading}
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center space-x-2 disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                <span>Clock In</span>
              </button>

              <button
                onClick={() => handlePunch('OUT')}
                disabled={punchLoading}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center space-x-2 disabled:opacity-60"
              >
                <LogOut className="w-4 h-4" />
                <span>Clock Out</span>
              </button>
            </div>
          </div>

          {/* Monthly Timesheet & Stats */}
          {timesheet && (
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Days Present</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{timesheet.stats?.presentDays}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Late Check-ins</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{timesheet.stats?.lateDays}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Approved Leaves</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{timesheet.stats?.leaveDays}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Holidays Observed</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{timesheet.stats?.holidayDays}</p>
                </div>
              </div>

              {/* Timesheet Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                    <CalendarIcon className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    Monthly Log: {timesheet.month}/{timesheet.year}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-4 py-3">First In</th>
                        <th className="px-4 py-3">Last Out</th>
                        <th className="px-4 py-3">Work Hours</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-6 py-3">Notes / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {timesheet.days?.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50/70">
                          <td className="px-6 py-3 font-semibold text-slate-900">{d.date}</td>
                          <td className="px-4 py-3 font-mono">
                            {d.firstIn ? new Date(d.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {d.lastOut ? new Date(d.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </td>
                          <td className="px-4 py-3">
                            {d.totalWorkMinutes > 0 ? `${(d.totalWorkMinutes / 60).toFixed(1)} hrs` : '0 hrs'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(d.status)}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-400 text-[11px]">
                            {d.holidayName ? `Official Holiday (${d.holidayName})` : d.isLate ? `Late by ${d.lateMinutes}m` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WORK SCHEDULES & OFFICE TIMINGS (ADMIN) */}
      {activeTab === 'schedules' && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configured Work Schedules & Shifts</h3>
                <p className="text-xs text-slate-500">
                  Configure dynamic 5-day / 6-day work weeks, office hours, and hybrid/remote work modes
                </p>
              </div>

              <button
                onClick={handleOpenAddShift}
                className="inline-flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Work Schedule
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {shifts.map((s) => (
                <div key={s._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-900">{s.name}</h4>
                      <span className="font-mono text-xs text-slate-400">({s.code})</span>
                      {s.isDefault && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Company Default
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {s.workMode || 'OFFICE'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>Office Timing: <strong className="text-slate-900">{s.startTime} - {s.endTime}</strong></span>
                      <span>Grace: <strong className="text-slate-900">{s.graceMinutes}m</strong></span>
                      <span>Full Day: <strong className="text-slate-900">{(s.fullDayMinutes / 60).toFixed(1)}h</strong></span>
                      <span>Half Day: <strong className="text-slate-900">{(s.halfDayMinutes / 60).toFixed(1)}h</strong></span>
                    </div>

                    <div className="flex items-center space-x-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 mr-1">Working Days ({s.workDays?.length || 5}-Day):</span>
                      {allWeekDays.map((d) => {
                        const isWorkDay = s.workDays?.includes(d.id);
                        return (
                          <span
                            key={d.id}
                            className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                              isWorkDay
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {d.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!s.isDefault && (
                      <button
                        onClick={() => handleSetDefaultShift(s._id, s.name)}
                        className="px-3 py-1.5 border border-slate-300 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Set Default
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditShift(s)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Edit Schedule"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!s.isDefault && (
                      <button
                        onClick={() => handleDeleteShift(s._id, s.name)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT WORK SCHEDULE */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Sliders className="w-4 h-4 mr-1.5 text-indigo-600" />
                {editingShiftId ? 'Edit Work Schedule' : 'Create Custom Work Schedule'}
              </h3>
              <button
                onClick={() => setShowShiftModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {shiftError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{shiftError}</span>
              </div>
            )}

            <form onSubmit={handleSaveShift} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingShiftId}
                    placeholder="e.g. SH_6D, TECH_HYB"
                    value={shiftForm.code}
                    onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Mode</label>
                  <select
                    value={shiftForm.workMode}
                    onChange={(e) => setShiftForm({ ...shiftForm, workMode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OFFICE">Office (On-Premises)</option>
                    <option value="HYBRID">Hybrid (Flexible)</option>
                    <option value="REMOTE">Remote (Work From Home)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Schedule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operations 6-Day Shift (09:30 - 18:30)"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Office Start Time</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Office End Time</label>
                  <input
                    type="time"
                    required
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={shiftForm.graceMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, graceMinutes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Break Time (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={shiftForm.breakMinutes}
                    onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Working Days Checkboxes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Working Days (Configure 5-Day, 6-Day, or Custom)
                </label>
                <div className="flex flex-wrap gap-2">
                  {allWeekDays.map((d) => {
                    const isChecked = shiftForm.workDays.includes(d.id);
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleWorkDay(d.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 inline mr-1" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selected: {shiftForm.workDays.length}-day working week. Days not checked will be treated as Weekly-Offs.
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultShiftToggle"
                  checked={shiftForm.isDefault}
                  onChange={(e) => setShiftForm({ ...shiftForm, isDefault: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="defaultShiftToggle" className="text-slate-700 font-medium">
                  Set as Organization Default Work Schedule
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={shiftLoading}
                  className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-60"
                >
                  {shiftLoading ? 'Saving...' : editingShiftId ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePortalView;
