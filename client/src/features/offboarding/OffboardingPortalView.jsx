import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  LogOut,
  UserMinus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
  Send,
  HelpCircle,
  Laptop,
  CreditCard,
  Building,
  Key,
  Users,
  Eye,
  Check,
  XCircle,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

/**
 * Offboarding & Exit Management Portal View
 * Handles employee resignation submission, notice period review,
 * departmental clearance checklist, and full & final exit settlement
 */
export const OffboardingPortalView = () => {
  const { user, hasRole } = useAuth();

  // Data states
  const [resignations, setResignations] = useState([]);
  const [selectedResignation, setSelectedResignation] = useState(null);
  const [clearanceTasks, setClearanceTasks] = useState([]);
  const [settlementCalc, setSettlementCalc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Form: Submit Resignation
  const defaultLwd = new Date();
  defaultLwd.setDate(defaultLwd.getDate() + 30);
  const [resignationForm, setResignationForm] = useState({
    proposedLastWorkingDay: defaultLwd.toISOString().split('T')[0],
    reasonCategory: 'CAREER_GROWTH',
    reasonDetails: '',
    handoverNotes: '',
    noticePeriodDays: 30,
  });

  // Form: Review Resignation
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED',
    approvedLastWorkingDay: '',
    approverNotes: '',
  });

  // Form: Finalize Settlement
  const [settleForm, setSettleForm] = useState({
    noticeShortfallDays: 0,
    encashableLeaveDays: 0,
    payableDays: 30,
    settlementAmount: 50000,
    remarks: 'Full & final exit settlement processed successfully',
  });

  const isPrivileged =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('MANAGER');

  useEffect(() => {
    fetchResignations();
  }, []);

  const fetchResignations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/offboarding/resignations');
      const data = res.data.data || [];
      setResignations(data);

      // If regular employee has an active resignation, select it automatically
      if (!isPrivileged && data.length > 0) {
        openClearanceDetails(data[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load offboarding records');
    } finally {
      setLoading(false);
    }
  };

  const openClearanceDetails = async (resignationId) => {
    try {
      const res = await api.get(`/offboarding/resignations/${resignationId}`);
      setSelectedResignation(res.data.data.resignation);
      setClearanceTasks(res.data.data.tasks || []);
    } catch (err) {
      setError(err.message || 'Failed to load clearance details');
    }
  };

  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    try {
      await api.post('/offboarding/resignations', resignationForm);
      setSuccessMsg('Resignation submitted successfully. Departmental clearance checklist initiated.');
      setShowSubmitModal(false);
      fetchResignations();
    } catch (err) {
      setError(err.message || 'Failed to submit resignation');
    }
  };

  const handleWithdrawResignation = async (resignationId) => {
    if (!window.confirm('Are you sure you want to withdraw your resignation?')) return;
    try {
      await api.post(`/offboarding/resignations/${resignationId}/withdraw`);
      setSuccessMsg('Resignation withdrawn successfully');
      fetchResignations();
    } catch (err) {
      setError(err.message || 'Failed to withdraw resignation');
    }
  };

  const openReviewModal = (resignation) => {
    setSelectedResignation(resignation);
    setReviewForm({
      status: 'APPROVED',
      approvedLastWorkingDay: resignation.approvedLastWorkingDay
        ? new Date(resignation.approvedLastWorkingDay).toISOString().split('T')[0]
        : new Date(resignation.proposedLastWorkingDay).toISOString().split('T')[0],
      approverNotes: '',
    });
    setShowReviewModal(true);
  };

  const handleReviewResignation = async (e) => {
    e.preventDefault();
    if (!selectedResignation) return;

    try {
      await api.put(`/offboarding/resignations/${selectedResignation._id}/review`, reviewForm);
      setSuccessMsg(`Resignation reviewed with status: ${reviewForm.status}`);
      setShowReviewModal(false);
      fetchResignations();
      if (selectedResignation) {
        openClearanceDetails(selectedResignation._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to review resignation');
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus, remarks = '') => {
    try {
      await api.put(`/offboarding/tasks/${taskId}`, { status: newStatus, remarks });
      setSuccessMsg(`Clearance task updated to ${newStatus}`);
      if (selectedResignation) {
        openClearanceDetails(selectedResignation._id);
      }
      fetchResignations();
    } catch (err) {
      setError(err.message || 'Failed to update clearance task');
    }
  };

  const openSettlementModal = async (resignation) => {
    setSelectedResignation(resignation);
    try {
      const res = await api.get(`/offboarding/resignations/${resignation._id}/settlement`);
      const calc = res.data.data;
      setSettlementCalc(calc);
      setSettleForm({
        noticeShortfallDays: calc.noticeShortfallDays || 0,
        encashableLeaveDays: calc.encashableLeaveDays || 0,
        payableDays: calc.payableDaysInFinalMonth || 30,
        settlementAmount: 50000,
        remarks: 'Full & final exit settlement calculated and verified.',
      });
      setShowSettlementModal(true);
    } catch (err) {
      setError(err.message || 'Failed to compute settlement values');
    }
  };

  const handleFinalizeSettlement = async (e) => {
    e.preventDefault();
    if (!selectedResignation) return;

    if (!window.confirm('Finalizing settlement will permanently terminate employee status and deactivate system access. Proceed?')) {
      return;
    }

    try {
      const res = await api.post(`/offboarding/resignations/${selectedResignation._id}/settle`, settleForm);
      setSuccessMsg(res.data.message || 'Full & final settlement finalized successfully');
      setShowSettlementModal(false);
      fetchResignations();
      if (selectedResignation) {
        openClearanceDetails(selectedResignation._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to finalize settlement');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'IT_ASSETS':
        return <Laptop className="w-4 h-4 text-blue-600" />;
      case 'FINANCE_SETTLEMENT':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'HR_EXIT_INTERVIEW':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'ADMIN_FACILITY':
        return <Building className="w-4 h-4 text-amber-600" />;
      case 'ACCESS_REVOCATION':
        return <Key className="w-4 h-4 text-red-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'UNDER_REVIEW':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'WITHDRAWN':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getSettlementBadgeColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'TASKS_IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CLEARED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold';
      case 'SETTLED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const myResignation = !isPrivileged && resignations.length > 0 ? resignations[0] : null;

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center justify-between text-sm shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center">
                <LogOut className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Offboarding & Exit Clearances
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">Checklist & Settlement</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {isPrivileged ? 'Employee Exit & Clearance Portal' : 'My Exit & Resignation Portal'}
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              {isPrivileged
                ? 'Review employee resignation notices, verify departmental clearance tasks (IT, Finance, HR, Admin), and execute Full & Final exit settlements.'
                : 'Submit formal resignation notice, track last working day review, and monitor your departmental clearance status.'}
            </p>
          </div>

          {!isPrivileged && !myResignation && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-xs transition-colors"
            >
              <UserMinus className="w-4 h-4" />
              <span>Submit Resignation</span>
            </button>
          )}
        </div>
      </div>

      {/* EMPLOYEE SELF-SERVICE VIEW */}
      {!isPrivileged && (
        <div className="space-y-6">
          {myResignation ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resignation Overview Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeColor(myResignation.status)}`}>
                    Status: {myResignation.status}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getSettlementBadgeColor(myResignation.settlementStatus)}`}>
                    Exit: {myResignation.settlementStatus}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">Resignation Summary</h3>
                  <p className="text-xs text-slate-500">Notice period details and timeline</p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">Notice Submitted</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(myResignation.resignationDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">Proposed Last Day</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(myResignation.proposedLastWorkingDay).toLocaleDateString()}
                    </span>
                  </div>

                  {myResignation.approvedLastWorkingDay && (
                    <div className="flex items-center justify-between p-2.5 bg-purple-50 text-purple-900 rounded-xl border border-purple-200">
                      <span className="font-medium">Approved Last Day</span>
                      <span className="font-bold">
                        {new Date(myResignation.approvedLastWorkingDay).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">Notice Period</span>
                    <span className="font-semibold text-slate-800">{myResignation.noticePeriodDays} Days</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500">Primary Reason</span>
                    <span className="font-semibold text-slate-800">{myResignation.reasonCategory}</span>
                  </div>
                </div>

                {['SUBMITTED', 'UNDER_REVIEW'].includes(myResignation.status) && (
                  <button
                    onClick={() => handleWithdrawResignation(myResignation._id)}
                    className="w-full mt-2 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Withdraw Resignation
                  </button>
                )}
              </div>

              {/* Clearance Checklist Progress */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Departmental Clearance Checklist</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All 5 departments must verify clearance before full & final settlement.
                    </p>
                  </div>
                  <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                    {clearanceTasks.filter((t) => ['CLEARED', 'WAIVED'].includes(t.status)).length} / {clearanceTasks.length} Cleared
                  </div>
                </div>

                <div className="space-y-3">
                  {clearanceTasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs mt-0.5">
                          {getCategoryIcon(task.category)}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {task.category.replace('_', ' ')}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mt-0.5">{task.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                          {task.remarks && (
                            <p className="text-[11px] text-indigo-600 mt-1 italic">Remarks: {task.remarks}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${
                          task.status === 'CLEARED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'WAIVED'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl w-fit mx-auto mb-3">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Active Resignation Notice</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You are currently in active employment. If you wish to submit a formal resignation, click below to initiate the exit workflow.
              </p>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="mt-5 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Initiate Resignation
              </button>
            </div>
          )}
        </div>
      )}

      {/* HR / MANAGER EXIT MANAGEMENT VIEW */}
      {isPrivileged && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Employee Exit Notices</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage employee resignations, clearance and settlements</p>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Resignation Date</th>
                    <th className="py-3 px-4">Proposed LWD</th>
                    <th className="py-3 px-4">Approved LWD</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Clearance / Exit</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {resignations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No resignation records found.
                      </td>
                    </tr>
                  ) : (
                    resignations
                      .filter((r) => statusFilter === 'ALL' || r.status === statusFilter)
                      .map((resignation) => (
                        <tr key={resignation._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {resignation.employeeId?.firstName} {resignation.employeeId?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {resignation.employeeId?.employeeCode} • {resignation.employeeId?.workEmail}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {new Date(resignation.resignationDate).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {new Date(resignation.proposedLastWorkingDay).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4">
                            {resignation.approvedLastWorkingDay ? (
                              <span className="font-bold text-purple-700">
                                {new Date(resignation.approvedLastWorkingDay).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending Review</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(resignation.status)}`}>
                              {resignation.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getSettlementBadgeColor(resignation.settlementStatus)}`}>
                              {resignation.settlementStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {['SUBMITTED', 'UNDER_REVIEW'].includes(resignation.status) && (
                                <button
                                  onClick={() => openReviewModal(resignation)}
                                  className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold"
                                >
                                  Review
                                </button>
                              )}

                              <button
                                onClick={async () => {
                                  await openClearanceDetails(resignation._id);
                                  setShowClearanceModal(true);
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold"
                              >
                                Checklist
                              </button>

                              {resignation.status === 'APPROVED' && resignation.settlementStatus !== 'SETTLED' && (
                                <button
                                  onClick={() => openSettlementModal(resignation)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                                >
                                  F&F Settle
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Submit Resignation (Self-Service) */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <LogOut className="w-5 h-5 text-rose-600 mr-2" />
              Submit Resignation Notice
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Submit your formal exit notice to HR and your reporting manager.
            </p>

            <form onSubmit={handleSubmitResignation} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Reason Category *</label>
                <select
                  required
                  value={resignationForm.reasonCategory}
                  onChange={(e) => setResignationForm({ ...resignationForm, reasonCategory: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="CAREER_GROWTH">Career Growth & New Opportunities</option>
                  <option value="HIGHER_STUDIES">Higher Studies / Academic Pursuit</option>
                  <option value="BETTER_COMPENSATION">Better Compensation / Offer</option>
                  <option value="PERSONAL_REASONS">Personal / Family Reasons</option>
                  <option value="RELOCATION">Geographic Relocation</option>
                  <option value="HEALTH">Health & Wellness</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Proposed Last Working Day *</label>
                  <input
                    type="date"
                    required
                    value={resignationForm.proposedLastWorkingDay}
                    onChange={(e) => setResignationForm({ ...resignationForm, proposedLastWorkingDay: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Notice Days</label>
                  <input
                    type="number"
                    value={resignationForm.noticePeriodDays}
                    onChange={(e) => setResignationForm({ ...resignationForm, noticePeriodDays: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Reason Details & Message</label>
                <textarea
                  rows="3"
                  placeholder="Additional context for management and HR..."
                  value={resignationForm.reasonDetails}
                  onChange={(e) => setResignationForm({ ...resignationForm, reasonDetails: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Handover Notes / Plan</label>
                <textarea
                  rows="2"
                  placeholder="Outline handover status, pending project tasks, and KT leads..."
                  value={resignationForm.handoverNotes}
                  onChange={(e) => setResignationForm({ ...resignationForm, handoverNotes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Submit Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Resignation (Manager / HR) */}
      {showReviewModal && selectedResignation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Review Resignation Notice</h3>
            <p className="text-xs text-slate-500 mt-1">
              For: {selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName} (
              {selectedResignation.employeeId?.employeeCode})
            </p>

            <form onSubmit={handleReviewResignation} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Review Decision *</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="APPROVED">Approve (Move to Notice Period)</option>
                  <option value="REJECTED">Reject Resignation</option>
                  <option value="UNDER_REVIEW">Keep Under Review</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Approved Last Working Day *</label>
                <input
                  type="date"
                  required
                  value={reviewForm.approvedLastWorkingDay}
                  onChange={(e) => setReviewForm({ ...reviewForm, approvedLastWorkingDay: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Approver Notes / Remarks</label>
                <textarea
                  rows="3"
                  placeholder="Official approval remarks, handover expectations..."
                  value={reviewForm.approverNotes}
                  onChange={(e) => setReviewForm({ ...reviewForm, approverNotes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Confirm Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Clearance Checklist Inspector (HR / Admin) */}
      {showClearanceModal && selectedResignation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Departmental Clearance Inspector</h3>
                <p className="text-xs text-slate-500">
                  Employee: {selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName} (
                  {selectedResignation.employeeId?.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setShowClearanceModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {clearanceTasks.map((task) => (
                <div
                  key={task._id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs mt-0.5">
                      {getCategoryIcon(task.category)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {task.category.replace('_', ' ')}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-0.5">{task.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                      {task.remarks && (
                        <p className="text-[11px] text-indigo-600 mt-1 italic">Remarks: {task.remarks}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                        task.status === 'CLEARED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : task.status === 'WAIVED'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {task.status}
                    </span>

                    {task.status !== 'CLEARED' && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task._id, 'CLEARED', 'Verified and cleared')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}

                    {task.status !== 'WAIVED' && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task._id, 'WAIVED', 'Waived by authorized administrator')}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg text-xs font-semibold"
                      >
                        Waive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Full & Final Settlement */}
      {showSettlementModal && selectedResignation && settlementCalc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit border border-emerald-200 text-xs font-bold mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Full & Final Exit Settlement</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Execute Settlement for {selectedResignation.employeeId?.firstName} {selectedResignation.employeeId?.lastName}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Finalizes financial calculations, encashes leave, relieves employee, and deprovisions system login credentials.
            </p>

            <form onSubmit={handleFinalizeSettlement} className="mt-4 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Notice Period Served</span>
                  <span className="font-semibold text-slate-800">{settlementCalc.daysServed} / {settlementCalc.noticePeriodDays} Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Notice Shortfall Days</span>
                  <span className="font-semibold text-rose-600">{settlementCalc.noticeShortfallDays} Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Unused Encashable Leaves</span>
                  <span className="font-bold text-emerald-600">{settlementCalc.encashableLeaveDays} Days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Payable Days in Final Month</span>
                  <span className="font-semibold text-slate-800">{settlementCalc.payableDaysInFinalMonth} Days</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Net Settlement Amount (INR) *</label>
                <input
                  type="number"
                  required
                  value={settleForm.settlementAmount}
                  onChange={(e) => setSettleForm({ ...settleForm, settlementAmount: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Settlement Remarks</label>
                <textarea
                  rows="2"
                  value={settleForm.remarks}
                  onChange={(e) => setSettleForm({ ...settleForm, remarks: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
