import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Users,
  Briefcase,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import api from '../../lib/axios';

/**
 * Enterprise Reports & Workforce Analytics Hub
 * Executive KPIs, live department analytics, and 1-click statutory CSV exports
 */
export const ReportsAnalyticsView = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'census' | 'leave' | 'payroll'
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [censusData, setCensusData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'census' && censusData.length === 0) loadCensus();
    if (activeTab === 'leave') loadLeaveBalances(selectedYear);
    if (activeTab === 'payroll' && payrollData.length === 0) loadPayrollRegister();
  }, [activeTab, selectedYear]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/overview');
      setOverview(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load executive overview');
    } finally {
      setLoading(false);
    }
  };

  const loadCensus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/census');
      setCensusData(res.data?.data?.rows || res.data?.data?.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load employee census');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveBalances = async (year) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/leave-balances?year=${year}`);
      setLeaveData(res.data?.data?.rows || res.data?.data?.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollRegister = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/payroll-register');
      setPayrollData(res.data?.data?.rows || res.data?.data?.records || []);
    } catch (err) {
      setError(err.message || 'Failed to load payroll register');
    } finally {
      setLoading(false);
    }
  };

  const downloadReportCsv = async (endpoint, filename) => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/reports/${endpoint}`, {
        credentials: 'include',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) throw new Error('Failed to download CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Analytics & Reports</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full">
              Workforce Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Executive intelligence, workforce census metrics, and statutory CSV exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 bg-white px-4 pt-2 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Executive Overview
        </button>

        <button
          onClick={() => setActiveTab('census')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'census'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Employee Census ({overview?.workforce?.totalEmployees || 0})
        </button>

        <button
          onClick={() => setActiveTab('leave')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'leave'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Leave Balances
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'payroll'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payroll Register
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Workforce</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{overview.workforce?.totalEmployees || 0}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{overview.workforce?.activeEmployees || 0} Active ({overview.workforce?.retentionRatePercentage || 100}% Retention)</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Recruitment Velocity</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{overview.recruitment?.openRequisitions || 0}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                <span>{overview.recruitment?.totalCandidatesInPipeline || 0} Candidates • {overview.recruitment?.conversionRatePercentage || 0}% Conversion</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Approved Leaves YTD</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{overview.leaveAndAttendance?.totalLeavesApprovedYearToDate || 0}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                <span>Annual automated cycle {new Date().getFullYear()}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Asset Utilization</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{overview.operations?.assetUtilizationPercentage || 0}%</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                <span>{overview.operations?.allocatedAssets || 0} of {overview.operations?.totalAssets || 0} Assets Allocated</span>
              </div>
            </div>
          </div>

          {/* Department Breakdown & Operations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800">Headcount by Department</h2>
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {overview.workforce?.departmentBreakdown?.map((d, idx) => {
                  const pct = overview.workforce.totalEmployees > 0
                    ? Math.round((d.count / overview.workforce.totalEmployees) * 100)
                    : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{d.departmentName}</span>
                        <span className="text-slate-500 font-medium">{d.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payroll & Financial Snapshot */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800">Payroll Disbursement Summary</h2>
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 mb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Latest Cycle</span>
                  <span className="font-bold text-slate-800">{overview.payroll?.latestPeriod}</span>
                </div>
                <div className="flex justify-between items-center text-xs mt-2">
                  <span className="text-slate-500">Status</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                    {overview.payroll?.latestRunStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <p className="text-[11px] font-medium text-indigo-700">Gross Payable</p>
                  <p className="text-lg font-bold text-indigo-950 mt-1">₹{Number(overview.payroll?.totalGrossPayable || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-[11px] font-medium text-emerald-700">Net Disbursed</p>
                  <p className="text-lg font-bold text-emerald-950 mt-1">₹{Number(overview.payroll?.totalNetDisbursed || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Employer Statutory PF:</span>
                <span className="font-semibold text-slate-800">₹{Number(overview.payroll?.totalPfContribution || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE CENSUS */}
      {activeTab === 'census' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Corporate Employee Master Census</h2>
              <p className="text-xs text-slate-500">Complete workforce record listing</p>
            </div>
            <button
              onClick={() => downloadReportCsv('census?format=csv', 'employee_census.csv')}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Census CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Employment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {censusData.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{emp.employeeCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{emp.fullName}</td>
                    <td className="py-3 px-4 text-slate-500">{emp.workEmail}</td>
                    <td className="py-3 px-4">{emp.department}</td>
                    <td className="py-3 px-4">{emp.designation}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">{emp.employmentType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE BALANCES */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Leave Balance Summary</h2>
                <p className="text-xs text-slate-500">Live employee leave quota allocations</p>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 bg-white"
              >
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((yr) => (
                  <option key={yr} value={yr}>Year {yr}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => downloadReportCsv(`leave-balances?year=${selectedYear}&format=csv`, `leave_balances_${selectedYear}.csv`)}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Leave CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Work Email</th>
                  <th className="py-3 px-4">Casual (CL)</th>
                  <th className="py-3 px-4">Sick (SL)</th>
                  <th className="py-3 px-4">Earned (EL)</th>
                  <th className="py-3 px-4">LWP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{row.employeeCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.fullName}</td>
                    <td className="py-3 px-4 text-slate-500">{row.workEmail}</td>
                    <td className="py-3 px-4 font-bold text-indigo-600">{row.CL ?? 0}</td>
                    <td className="py-3 px-4 font-bold text-amber-600">{row.SL ?? 0}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{row.EL ?? 0}</td>
                    <td className="py-3 px-4 font-bold text-slate-600">{row.LWP ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYROLL REGISTER */}
      {activeTab === 'payroll' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Corporate Payroll Register</h2>
              <p className="text-xs text-slate-500">Disbursement logs with earnings, deductions, and net pay</p>
            </div>
            <button
              onClick={() => downloadReportCsv('payroll-register?format=csv', 'payroll_register.csv')}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export Register CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Earnings</th>
                  <th className="py-3 px-4">Total Deductions</th>
                  <th className="py-3 px-4">Net Payable</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{row.employeeCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.employeeName}</td>
                    <td className="py-3 px-4">{row.department}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{row.period}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">₹{Number(row.grossEarnings || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-red-600">₹{Number(row.totalDeductions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">₹{Number(row.netPay || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsAnalyticsView;
