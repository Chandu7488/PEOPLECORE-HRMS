import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  FileText,
  ChevronRight,
  X,
  Sparkles,
  Edit2,
  Trash2,
  Sliders,
  Settings,
} from 'lucide-react';

export const LeavePortalView = () => {
  const { user, hasRole } = useAuth();
  const isHrOrAdmin = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN');
  const canApprove =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('MANAGER') ||
    hasRole('EXECUTIVE');

  const [activeTab, setActiveTab] = useState('my-leave'); // 'my-leave' | 'team-approvals' | 'policies'
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply Leave Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    halfDaySession: 'FIRST_HALF',
    reason: '',
  });
  const [previewDeduction, setPreviewDeduction] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Policy Modal State (Admin)
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState(null);
  const [policyForm, setPolicyForm] = useState({
    code: '',
    name: '',
    category: 'CASUAL',
    annualQuota: 12,
    isPaid: true,
    carryForwardLimit: 0,
    minNoticeDays: 0,
    description: '',
  });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState(null);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const [balRes, reqRes, polRes] = await Promise.all([
        api.get('/leave/balances/me'),
        api.get('/leave/requests/me'),
        api.get('/leave/types'),
      ]);
      setBalances(balRes.data.data.balances || []);
      setMyRequests(reqRes.data.data || []);
      setLeavePolicies(polRes.data.data || []);

      if (canApprove) {
        const teamRes = await api.get('/leave/requests/team');
        setTeamRequests(teamRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  // Recalculate deduction preview in real-time when dates change
  useEffect(() => {
    const calcPreview = async () => {
      if (applyForm.startDate && applyForm.endDate && applyForm.startDate <= applyForm.endDate) {
        try {
          const res = await api.post('/leave/calculate-preview', {
            startDate: applyForm.startDate,
            endDate: applyForm.endDate,
            isHalfDay: applyForm.isHalfDay,
          });
          setPreviewDeduction(res.data.data);
          setApplyError(null);
        } catch (err) {
          setPreviewDeduction(null);
        }
      } else {
        setPreviewDeduction(null);
      }
    };
    calcPreview();
  }, [applyForm.startDate, applyForm.endDate, applyForm.isHalfDay]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError(null);

    try {
      await api.post('/leave/requests', applyForm);
      setShowApplyModal(false);
      setApplyForm({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        isHalfDay: false,
        halfDaySession: 'FIRST_HALF',
        reason: '',
      });
      setPreviewDeduction(null);
      setActionSuccess('Leave application submitted successfully for manager approval.');
      fetchLeaveData();
    } catch (err) {
      setApplyError(err.message || 'Failed to apply for leave');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.post(`/leave/requests/${requestId}/approve`);
      setActionSuccess('Leave request approved and double-entry ledger updated.');
      fetchLeaveData();
    } catch (err) {
      alert(err.message || 'Failed to approve leave request');
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    try {
      await api.post(`/leave/requests/${requestId}/reject`, { reason });
      setActionSuccess('Leave request rejected.');
      fetchLeaveData();
    } catch (err) {
      alert(err.message || 'Failed to reject leave request');
    }
  };

  // Open Policy Modal for Add
  const handleOpenAddPolicy = () => {
    setEditingPolicyId(null);
    setPolicyForm({
      code: '',
      name: '',
      category: 'CASUAL',
      annualQuota: 12,
      isPaid: true,
      carryForwardLimit: 0,
      minNoticeDays: 0,
      description: '',
    });
    setPolicyError(null);
    setShowPolicyModal(true);
  };

  // Open Policy Modal for Edit
  const handleOpenEditPolicy = (policy) => {
    setEditingPolicyId(policy._id);
    setPolicyForm({
      code: policy.code,
      name: policy.name,
      category: policy.category || 'CASUAL',
      annualQuota: policy.annualQuota,
      isPaid: policy.isPaid,
      carryForwardLimit: policy.carryForwardLimit || 0,
      minNoticeDays: policy.minNoticeDays || 0,
      description: policy.description || '',
    });
    setPolicyError(null);
    setShowPolicyModal(true);
  };

  // Submit Policy (Create or Update)
  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setPolicyLoading(true);
    setPolicyError(null);

    try {
      if (editingPolicyId) {
        await api.put(`/leave/types/${editingPolicyId}`, policyForm);
        setActionSuccess(`Leave policy "${policyForm.name}" updated successfully.`);
      } else {
        await api.post('/leave/types', policyForm);
        setActionSuccess(`Leave policy "${policyForm.name}" created with ${policyForm.annualQuota} days quota.`);
      }
      setShowPolicyModal(false);
      fetchLeaveData();
    } catch (err) {
      setPolicyError(err.response?.data?.error?.message || err.message || 'Failed to save leave policy');
    } finally {
      setPolicyLoading(false);
    }
  };

  // Deactivate Policy
  const handleDeletePolicy = async (policyId, policyCode) => {
    if (!window.confirm(`Are you sure you want to deactivate leave policy "${policyCode}"?`)) return;
    try {
      await api.delete(`/leave/types/${policyId}`);
      setActionSuccess(`Leave policy "${policyCode}" deactivated.`);
      fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete leave policy');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Leave Management Portal</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable policies, double-entry ledger, calendar exclusions, and team approvals
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isHrOrAdmin && (
            <button
              onClick={handleOpenAddPolicy}
              className="inline-flex items-center px-3 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Configure Quotas
            </button>
          )}

          <button
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Apply for Leave
          </button>
        </div>
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

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('my-leave')}
          className={`pb-3 px-3 border-b-2 transition-colors ${
            activeTab === 'my-leave'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          My Leave & Balances
        </button>

        {canApprove && (
          <button
            onClick={() => setActiveTab('team-approvals')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'team-approvals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Team Approvals</span>
            {teamRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                {teamRequests.filter((r) => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}

        {isHrOrAdmin && (
          <button
            onClick={() => setActiveTab('policies')}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'policies'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 mr-1" />
            Leave Policies & Quotas (Admin)
          </button>
        )}
      </div>

      {/* TAB 1: MY LEAVE & BALANCES */}
      {activeTab === 'my-leave' && (
        <div className="space-y-6">
          {/* Dynamic Balances Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((b, idx) => (
              <div
                key={b.leaveTypeId || b.leaveType?._id || b.code || idx}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 text-indigo-700 uppercase">
                    {b.code || b.leaveType?.code || 'LEAVE'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Allocated: {b.allocated ?? b.totalAllocated ?? b.leaveType?.annualQuota ?? 0}d
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-700">{b.name || b.leaveType?.name || 'Leave Category'}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {b.balance ?? b.availableBalance ?? b.currentBalance ?? 0} <span className="text-xs font-normal text-slate-400">days left</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* My Applications Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <CalendarIcon className="w-3.5 h-3.5 mr-1 text-indigo-600" /> My Leave Applications ({myRequests.length})
              </h3>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No leave applications found. Click "Apply for Leave" above to request time off.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Leave Type</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Deduction (Net Days)</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myRequests.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{r.leaveTypeId?.name}</td>
                        <td className="px-4 py-3.5">
                          {r.startDate?.slice(0, 10)} to {r.endDate?.slice(0, 10)}
                          {r.isHalfDay && (
                            <span className="ml-1 text-[10px] bg-blue-50 text-blue-700 px-1 rounded">Half-Day</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-indigo-700">{r.deductedDays} days</span>
                          <span className="text-slate-400 text-[10px] ml-1">({r.totalDays} calendar days)</span>
                        </td>
                        <td className="px-4 py-3.5 max-w-xs truncate">{r.reason}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              r.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : r.status === 'REJECTED'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {r.status}
                          </span>
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

      {/* TAB 2: TEAM APPROVALS */}
      {activeTab === 'team-approvals' && canApprove && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Team Leave Approvals ({teamRequests.length})
            </h3>
          </div>

          {teamRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No leave requests currently pending your review.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {teamRequests.map((r) => (
                <div key={r._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {r.employeeId?.firstName} {r.employeeId?.lastName}
                      </span>
                      <span className="text-slate-400 text-xs">({r.employeeId?.employeeCode})</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700">
                        {r.leaveTypeId?.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Dates: <strong>{r.startDate?.slice(0, 10)}</strong> to <strong>{r.endDate?.slice(0, 10)}</strong>{' '}
                      • Charging: <strong>{r.deductedDays} working days</strong> (Holidays/Offs excluded)
                    </p>
                    <p className="text-xs text-slate-500 italic">"{r.reason}"</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {r.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleReject(r._id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(r._id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LEAVE POLICIES & QUOTAS (ADMIN) */}
      {activeTab === 'policies' && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Configured Company Leave Policies</h3>
                <p className="text-xs text-slate-500">
                  Manage company leave types and annual quotas dynamically without code changes
                </p>
              </div>

              <button
                onClick={handleOpenAddPolicy}
                className="inline-flex items-center px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add New Policy
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Code</th>
                    <th className="px-4 py-3.5">Leave Name</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Annual Quota</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Carry Forward</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leavePolicies.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{p.code}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">
                        {p.name}
                        {p.description && <p className="text-[11px] text-slate-400 font-normal">{p.description}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-indigo-700 text-sm">{p.annualQuota}</span> days / year
                      </td>
                      <td className="px-4 py-4">
                        {p.isPaid ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                            Paid Leave
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                            Unpaid (LWP)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{p.carryForwardLimit || 0} days</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditPolicy(p)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Quota & Policy"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(p._id, p.code)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deactivate Policy"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: APPLY FOR LEAVE */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Apply for Time Off</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {applyError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Leave Type</label>
                <select
                  required
                  value={applyForm.leaveTypeId}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Leave Category --</option>
                  {leavePolicies.map((lt) => (
                    <option key={lt._id} value={lt._id}>
                      {lt.name} ({lt.code}) • {lt.annualQuota}d quota {lt.isPaid ? '• Paid' : '• Unpaid'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="halfDayToggle"
                  checked={applyForm.isHalfDay}
                  onChange={(e) => setApplyForm({ ...applyForm, isHalfDay: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="halfDayToggle" className="text-slate-700 font-medium">
                  Apply as Half-Day (0.5 day deduction)
                </label>
              </div>

              {/* Real-time Deduction Preview */}
              {previewDeduction && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                      Net Deduction Preview:
                    </span>
                    <span className="text-sm font-black text-indigo-700">
                      {previewDeduction.deductedDays} working day(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {previewDeduction.breakdown?.map((b) => (
                      <span
                        key={b.date}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                          b.status === 'COMPANY_HOLIDAY'
                            ? 'bg-purple-100 text-purple-800'
                            : b.status === 'WEEKLY_OFF'
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-indigo-200 text-indigo-800'
                        }`}
                      >
                        {b.date.slice(5)}:{' '}
                        {b.status === 'COMPANY_HOLIDAY'
                          ? `Holiday (${b.holidayName})`
                          : b.status === 'WEEKLY_OFF'
                          ? 'Weekly-Off'
                          : 'Deducted'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  rows="2"
                  required
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="Please state the purpose of time off..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-60"
                >
                  {applyLoading ? 'Submitting...' : 'Confirm Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE LEAVE POLICY (ADMIN) */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <Settings className="w-4 h-4 mr-1.5 text-indigo-600" />
                {editingPolicyId ? 'Edit Leave Policy Quota' : 'Add New Custom Leave Policy'}
              </h3>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {policyError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{policyError}</span>
              </div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPolicyId}
                    placeholder="e.g. ML, PL, SIK, BEREAV"
                    value={policyForm.code}
                    onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl uppercase font-mono focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={policyForm.category}
                    onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CASUAL">Casual</option>
                    <option value="SICK">Sick / Medical</option>
                    <option value="EARNED">Earned / Annual</option>
                    <option value="MATERNITY">Maternity</option>
                    <option value="PATERNITY">Paternity</option>
                    <option value="COMPENSATORY">Compensatory Off</option>
                    <option value="UNPAID">Unpaid (LWP)</option>
                    <option value="SPECIAL">Special / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maternity Leave (26 Weeks)"
                  value={policyForm.name}
                  onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Annual Quota (Days) <span className="text-indigo-600 font-bold">*Type any number*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={policyForm.annualQuota}
                    onChange={(e) => setPolicyForm({ ...policyForm, annualQuota: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Carry Forward Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={policyForm.carryForwardLimit}
                    onChange={(e) => setPolicyForm({ ...policyForm, carryForwardLimit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isPaidToggle"
                  checked={policyForm.isPaid}
                  onChange={(e) => setPolicyForm({ ...policyForm, isPaid: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isPaidToggle" className="text-slate-700 font-medium">
                  Paid Leave (Deduct from salary if unchecked)
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Description / Rules</label>
                <textarea
                  rows="2"
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  placeholder="e.g. Available upon birth or adoption of child as per corporate policy..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={policyLoading}
                  className="px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-60"
                >
                  {policyLoading ? 'Saving...' : editingPolicyId ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePortalView;
