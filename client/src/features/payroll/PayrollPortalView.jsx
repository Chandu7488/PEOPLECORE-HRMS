import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import api from '../../lib/axios';
import {
  CreditCard,
  DollarSign,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  Lock,
  Play,
  Check,
  Send,
  Building,
  User,
  Calendar,
  Printer,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';

/**
 * Enterprise Payroll & Compensation Portal
 * Implements Section 4.8 of PeopleCore HRMS Master Specification:
 * - Deterministic decimal-safe calculation engine
 * - Attendance & Unpaid Leave (LWP) automatic proration
 * - Maker-checker separation of duties (preparer != approver)
 * - Immutable locked state & published corporate payslips
 * - Bank advice & payroll register CSV export
 */
export const PayrollPortalView = () => {
  const { user, hasRole } = useAuth();
  const isHrOrAdmin = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN') || hasRole('PAYROLL_ADMIN');

  const [activeTab, setActiveTab] = useState(isHrOrAdmin ? 'runs' : 'my-payslips');
  const [runs, setRuns] = useState([]);
  const [myPayslips, setMyPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Dynamic Date Calculations based on current system time
  const now = new Date();
  const defaultPrevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultYear = defaultPrevDate.getFullYear();
  const defaultMonth = defaultPrevDate.getMonth() + 1;
  const getLastDayOfMonth = (year, month) => {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  // New Cycle Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRunYear, setNewRunYear] = useState(defaultYear);
  const [newRunMonth, setNewRunMonth] = useState(defaultMonth);
  const [newRunPayoutDate, setNewRunPayoutDate] = useState(getLastDayOfMonth(defaultYear, defaultMonth));
  const [newRunNotes, setNewRunNotes] = useState('');

  // Run Details & Breakdown Modal State
  const [selectedRunDetails, setSelectedRunDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Printable Payslip Modal State
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  // Salary structures
  const [structures, setStructures] = useState([]);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const fetchPayrollData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isHrOrAdmin) {
        const [runsRes, structRes] = await Promise.all([
          api.get('/payroll/runs'),
          api.get('/payroll/salary-structures'),
        ]);
        setRuns(runsRes.data.data || []);
        setStructures(structRes.data.data || []);
      }

      const payslipsRes = await api.get('/payroll/payslips/me');
      setMyPayslips(payslipsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load payroll data:', err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [isHrOrAdmin]);

  // Handle Create New Run
  const handleCreateRun = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/payroll/runs', {
        year: newRunYear,
        month: newRunMonth,
        payoutDate: newRunPayoutDate,
        notes: newRunNotes,
      });
      setSuccessMsg(res.data.message);
      setShowCreateModal(false);
      await fetchPayrollData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create payroll run');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Calculate Payroll
  const handleCalculateRun = async (runId) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/payroll/runs/${runId}/calculate`);
      setSuccessMsg(res.data.message);
      await fetchPayrollData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Calculation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Submit for Review
  const handleSubmitReview = async (runId) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/payroll/runs/${runId}/submit-review`);
      setSuccessMsg(res.data.message);
      await fetchPayrollData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Submission failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Approve Run
  const handleApproveRun = async (runId) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/payroll/runs/${runId}/approve`);
      setSuccessMsg(res.data.message);
      await fetchPayrollData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Lock & Publish
  const handleLockRun = async (runId) => {
    if (!window.confirm('Are you sure you want to lock this payroll run? This will finalize all calculations, publish payslips to employees, and freeze the run immutably.')) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/payroll/runs/${runId}/lock`);
      setSuccessMsg(res.data.message);
      await fetchPayrollData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Locking failed');
    } finally {
      setActionLoading(false);
    }
  };

  // View Breakdown Details
  const handleViewRunDetails = async (runId) => {
    setActionLoading(true);
    try {
      const res = await api.get(`/payroll/runs/${runId}`);
      setSelectedRunDetails(res.data.data);
      setShowDetailsModal(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch run details');
    } finally {
      setActionLoading(false);
    }
  };

  // View Printable Payslip
  const handleOpenPayslip = async (payslipId) => {
    setActionLoading(true);
    try {
      const res = await api.get(`/payroll/payslips/${payslipId}`);
      setSelectedPayslip(res.data.data);
      setShowPayslipModal(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch payslip details');
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = async (runId, period) => {
    try {
      const response = await api.get(`/payroll/runs/${runId}/export`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PeopleCore-Payroll-Register-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download payroll export');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
      case 'CALCULATED':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">Calculated</span>;
      case 'REVIEW':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-200">In Review</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Approved</span>;
      case 'LOCKED':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center w-fit"><Lock className="w-3 h-3 mr-1" /> Locked & Published</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center">
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                Compensation & Payroll
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">India Labour Codes & Statutory PF/PT v2026.1</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">Payroll & Compensation</h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl">
              Deterministic salary proration, attendance integration, maker-checker governance, and self-service payslip generation.
            </p>
          </div>

          {isHrOrAdmin && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Open Payroll Cycle
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 mt-6 border-b border-slate-200">
          {isHrOrAdmin && (
            <button
              onClick={() => setActiveTab('runs')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center ${
                activeTab === 'runs'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-1.5" />
              Payroll Cycles ({runs.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('my-payslips')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center ${
              activeTab === 'my-payslips'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            My Payslips ({myPayslips.length})
          </button>

          {isHrOrAdmin && (
            <button
              onClick={() => setActiveTab('structures')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center ${
                activeTab === 'structures'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building className="w-4 h-4 mr-1.5" />
              Salary Structures & Compliance
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {/* TAB 1: PAYROLL RUNS (HR & ADMIN) */}
      {activeTab === 'runs' && isHrOrAdmin && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Total Cycles Tracked</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{runs.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Active Locked Cycles</p>
              <p className="text-xl font-bold text-purple-600 mt-1">
                {runs.filter((r) => r.status === 'LOCKED').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Statutory Ruleset</p>
              <p className="text-xs font-bold text-slate-800 mt-1">IN-STATUTORY-STANDARD</p>
              <p className="text-[10px] text-slate-400 mt-0.5">PF 12% + PT Slabs</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-xs text-slate-500 font-medium">Maker-Checker Policy</p>
              <p className="text-xs font-bold text-emerald-700 mt-1">Enforced (Sec. 237)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Preparer != Approver</p>
            </div>
          </div>

          {/* Runs List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Monthly Payroll Cycles</h3>
                <p className="text-xs text-slate-500">Track cycle preparation, calculation, review, and publishing</p>
              </div>
              <button
                onClick={fetchPayrollData}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {runs.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No payroll cycles created yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "Open Payroll Cycle" to initiate the month's salary cycle.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3.5">Period</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Employees</th>
                      <th className="px-4 py-3.5">Gross Pay</th>
                      <th className="px-4 py-3.5">Deductions (PF/PT)</th>
                      <th className="px-4 py-3.5">Net Payout</th>
                      <th className="px-4 py-3.5">Prepared By</th>
                      <th className="px-6 py-3.5 text-right">Workflow Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {runs.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {r.period}
                          <p className="text-[11px] text-slate-400 font-normal">
                            Payout: {new Date(r.payoutDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-4 py-4">{getStatusBadge(r.status)}</td>
                        <td className="px-4 py-4 font-medium">{r.totals?.totalEmployees || 0}</td>
                        <td className="px-4 py-4 font-medium">{formatCurrency(r.totals?.totalGrossPay)}</td>
                        <td className="px-4 py-4 text-red-600 font-medium">{formatCurrency(r.totals?.totalDeductions)}</td>
                        <td className="px-4 py-4 font-bold text-slate-900">{formatCurrency(r.totals?.totalNetPay)}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800">
                            {r.preparedBy?.firstName} {r.preparedBy?.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">{r.preparedBy?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Calculate Button (DRAFT or CALCULATED) */}
                            {r.status !== 'LOCKED' && (
                              <button
                                onClick={() => handleCalculateRun(r._id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                                title="Run calculation engine"
                              >
                                {r.status === 'DRAFT' ? 'Calculate' : 'Recalculate'}
                              </button>
                            )}

                            {/* Submit for Review (CALCULATED) */}
                            {r.status === 'CALCULATED' && (
                              <button
                                onClick={() => handleSubmitReview(r._id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                              >
                                Submit Review
                              </button>
                            )}

                            {/* Approve Button (REVIEW or CALCULATED) */}
                            {(r.status === 'REVIEW' || r.status === 'CALCULATED') && (
                              <button
                                onClick={() => handleApproveRun(r._id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                              >
                                Approve
                              </button>
                            )}

                            {/* Lock & Publish (APPROVED) */}
                            {r.status === 'APPROVED' && (
                              <button
                                onClick={() => handleLockRun(r._id)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors flex items-center"
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Lock & Publish
                              </button>
                            )}

                            {/* View Breakdown */}
                            {r.status !== 'DRAFT' && (
                              <button
                                onClick={() => handleViewRunDetails(r._id)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View Employee Breakdown"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {/* Export CSV */}
                            {r.status !== 'DRAFT' && (
                              <button
                                onClick={() => handleExportCsv(r._id, r.period)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Export Bank Advice / Register (CSV)"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MY PAYSLIPS (ALL USERS / SELF-SERVICE) */}
      {activeTab === 'my-payslips' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">My Monthly Payslips</h3>
            <p className="text-xs text-slate-500">Official compensation records, attendance breakdowns, and statutory contributions</p>
          </div>

          {myPayslips.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No published payslips found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Once HR finalizes and publishes the monthly payroll cycle, your official payslip will be available here for viewing and download.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myPayslips.map((ps) => (
                <div key={ps._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-slate-900">{ps.period?.periodString}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Published
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paid on {new Date(ps.period?.payoutDate).toLocaleDateString()} • {ps.attendanceSnapshot?.payableDays} of {ps.attendanceSnapshot?.totalDays} Payable Days
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <span className="text-slate-600 font-medium">Gross: {formatCurrency(ps.grossEarnings)}</span>
                        <span className="text-red-600 font-medium">Deductions: {formatCurrency(ps.totalDeductions)}</span>
                        <span className="text-emerald-700 font-bold">Net Pay: {formatCurrency(ps.netPay)}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => handleOpenPayslip(ps._id)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      View & Print Payslip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SALARY STRUCTURES (HR & ADMIN) */}
      {activeTab === 'structures' && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Standard Compensation Structure (`TECH_STD`)</h3>
            <p className="text-xs text-slate-500 mb-6">
              Compliant with Section 6 of Blueprint (India Labour Codes, Minimum Wage & Statutory Slabs)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Earnings Components
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-medium text-slate-900">Basic Salary</span>
                    <span>50% of CTC</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-medium text-slate-900">House Rent Allowance (HRA)</span>
                    <span>50% of Basic (25% of CTC)</span>
                  </li>
                  <li className="flex justify-between pb-1">
                    <span className="font-medium text-slate-900">Special Allowance</span>
                    <span>Residual Balancing (25%)</span>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1 text-red-600" /> Employee Deductions
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-medium text-slate-900">Provident Fund (PF)</span>
                    <span>12% of Earned Basic</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-medium text-slate-900">Professional Tax (PT)</span>
                    <span>₹200/mo (if gross &gt; ₹15,000)</span>
                  </li>
                  <li className="flex justify-between pb-1">
                    <span className="font-medium text-slate-900">Loss of Pay (LWP)</span>
                    <span>Automatic Proration per Day</span>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center">
                  <Building className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Employer Contributions
                </h4>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="font-medium text-slate-900">PF Employer Share</span>
                    <span>12% matching Basic</span>
                  </li>
                  <li className="flex justify-between pb-1">
                    <span className="font-medium text-slate-900">Gratuity Provision</span>
                    <span>4.81% (accrual basis)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: OPEN NEW PAYROLL CYCLE */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center">
              <Play className="w-4 h-4 mr-2 text-indigo-600" />
              Open Monthly Payroll Cycle
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select the calendar year and month to open the draft payroll period.
            </p>

            <form onSubmit={handleCreateRun} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year</label>
                  <select
                    value={newRunYear}
                    onChange={(e) => {
                      const y = parseInt(e.target.value, 10);
                      setNewRunYear(y);
                      setNewRunPayoutDate(getLastDayOfMonth(y, newRunMonth));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {[2028, 2027, 2026, 2025, 2024].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Month</label>
                  <select
                    value={newRunMonth}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setNewRunMonth(m);
                      setNewRunPayoutDate(getLastDayOfMonth(newRunYear, m));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement / Payout Date</label>
                <input
                  type="date"
                  required
                  value={newRunPayoutDate}
                  onChange={(e) => setNewRunPayoutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions (Optional)</label>
                <textarea
                  rows="2"
                  value={newRunNotes}
                  onChange={(e) => setNewRunNotes(e.target.value)}
                  placeholder="e.g. Regular monthly cycle with holiday exclusions applied"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-60"
                >
                  {actionLoading ? 'Creating...' : 'Create Draft Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RUN DETAILS & BREAKDOWN (HR & ADMIN) */}
      {showDetailsModal && selectedRunDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Payroll Cycle Breakdown: {selectedRunDetails.run?.period}
                </h3>
                <p className="text-xs text-slate-500">
                  Rule Version: {selectedRunDetails.run?.ruleVersion} • {selectedRunDetails.payslips?.length || 0} Employees Processed
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Code</th>
                      <th className="px-3 py-2.5">Employee Name</th>
                      <th className="px-3 py-2.5">Department</th>
                      <th className="px-3 py-2.5">Payable / Total</th>
                      <th className="px-3 py-2.5">Gross</th>
                      <th className="px-3 py-2.5">PF</th>
                      <th className="px-3 py-2.5">PT</th>
                      <th className="px-3 py-2.5">Net Pay</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRunDetails.payslips?.map((p) => {
                      const pf = p.deductions?.find((d) => d.code === 'PF_EMPLOYEE')?.amount || 0;
                      const pt = p.deductions?.find((d) => d.code === 'PROF_TAX')?.amount || 0;
                      return (
                        <tr key={p._id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-mono font-medium text-slate-900">{p.employeeSnapshot?.employeeCode}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{p.employeeSnapshot?.name}</td>
                          <td className="px-3 py-2.5">{p.employeeSnapshot?.department}</td>
                          <td className="px-3 py-2.5">
                            {p.attendanceSnapshot?.payableDays} / {p.attendanceSnapshot?.totalDays}
                            {p.attendanceSnapshot?.unpaidLeaveDays > 0 && (
                              <span className="ml-1 text-[10px] text-red-500">(-{p.attendanceSnapshot?.unpaidLeaveDays} LWP)</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-medium">{formatCurrency(p.grossEarnings)}</td>
                          <td className="px-3 py-2.5 text-red-600">{formatCurrency(pf)}</td>
                          <td className="px-3 py-2.5 text-red-600">{formatCurrency(pt)}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900">{formatCurrency(p.netPay)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => {
                                setSelectedPayslip(p);
                                setShowPayslipModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                              View Slip
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Total Net Payout: {formatCurrency(selectedRunDetails.run?.totals?.totalNetPay)}
              </span>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EXECUTIVE PRINTABLE PAYSLIP DOCUMENT */}
      {showPayslipModal && selectedPayslip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Action Bar (Not printed) */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold tracking-wide">
                  Corporate Payslip • {selectedPayslip.period?.periodString}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setShowPayslipModal(false)}
                  className="p-1 text-slate-400 hover:text-white font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div className="p-8 overflow-y-auto space-y-6 bg-white text-slate-800 print:p-0">
              {/* Header */}
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">PeopleCore</h2>
                      <p className="text-[10px] text-slate-500 font-medium">Technologies India Pvt. Ltd.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Plot No. 42, Tech Park Central, Outer Ring Road, Bengaluru 560103
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 rounded-md">
                    Payslip
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-2">{selectedPayslip.period?.periodString}</p>
                  <p className="text-[10px] text-slate-400">
                    Disbursed: {new Date(selectedPayslip.period?.payoutDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Employee & Bank Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <p><span className="text-slate-400">Employee Code:</span> <strong className="text-slate-900">{selectedPayslip.employeeSnapshot?.employeeCode}</strong></p>
                  <p><span className="text-slate-400">Employee Name:</span> <strong className="text-slate-900">{selectedPayslip.employeeSnapshot?.name}</strong></p>
                  <p><span className="text-slate-400">Department:</span> {selectedPayslip.employeeSnapshot?.department}</p>
                  <p><span className="text-slate-400">Designation:</span> {selectedPayslip.employeeSnapshot?.designation}</p>
                </div>
                <div className="space-y-1">
                  <p><span className="text-slate-400">Bank Name:</span> {selectedPayslip.employeeSnapshot?.bankName}</p>
                  <p><span className="text-slate-400">Bank Account:</span> {selectedPayslip.employeeSnapshot?.accountNumber}</p>
                  <p><span className="text-slate-400">IFSC Code:</span> {selectedPayslip.employeeSnapshot?.ifscCode}</p>
                  <p><span className="text-slate-400">PAN:</span> {selectedPayslip.employeeSnapshot?.pan}</p>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div>
                  <p className="text-[10px] text-slate-400">Calendar Days</p>
                  <p className="font-bold text-slate-800">{selectedPayslip.attendanceSnapshot?.totalDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Paid Days</p>
                  <p className="font-bold text-indigo-600">{selectedPayslip.attendanceSnapshot?.payableDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Holidays & Offs</p>
                  <p className="font-bold text-slate-800">
                    {(selectedPayslip.attendanceSnapshot?.holidays || 0) + (selectedPayslip.attendanceSnapshot?.weeklyOffs || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Unpaid (LWP)</p>
                  <p className="font-bold text-red-600">{selectedPayslip.attendanceSnapshot?.unpaidLeaveDays || 0}</p>
                </div>
              </div>

              {/* Earnings vs Deductions Table */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Earnings */}
                <div>
                  <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px] rounded-t-lg">
                    Earnings
                  </div>
                  <table className="w-full text-left divide-y divide-slate-100 border border-slate-200 border-t-0 rounded-b-lg">
                    <tbody>
                      {selectedPayslip.earnings?.map((e) => (
                        <tr key={e.code}>
                          <td className="px-3 py-2 text-slate-600">{e.name}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatCurrency(e.earnedAmount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-900">Total Gross Earnings</td>
                        <td className="px-3 py-2 text-right text-indigo-700">{formatCurrency(selectedPayslip.grossEarnings)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase tracking-wider text-slate-700 text-[10px] rounded-t-lg">
                    Deductions
                  </div>
                  <table className="w-full text-left divide-y divide-slate-100 border border-slate-200 border-t-0 rounded-b-lg">
                    <tbody>
                      {selectedPayslip.deductions?.map((d) => (
                        <tr key={d.code}>
                          <td className="px-3 py-2 text-slate-600">{d.name}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-600">{formatCurrency(d.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="px-3 py-2 text-slate-900">Total Deductions</td>
                        <td className="px-3 py-2 text-right text-red-700">{formatCurrency(selectedPayslip.totalDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Payable Highlight */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-indigo-800 font-semibold">Net Salary Payable</p>
                  <p className="text-[11px] text-slate-500 font-medium italic mt-0.5">
                    {selectedPayslip.netPayInWords}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-indigo-900">
                    {formatCurrency(selectedPayslip.netPay)}
                  </span>
                </div>
              </div>

              {/* Employer Contributions Note & Watermark */}
              <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400">
                <span>Employer Contribution: PF 12% matching credited to EPFO UAN account.</span>
                <span>This is a computer-generated document requiring no physical signature.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollPortalView;
