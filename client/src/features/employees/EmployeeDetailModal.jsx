import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  X,
  Mail,
  Phone,
  Calendar,
  Building,
  MapPin,
  UserCheck,
  Briefcase,
  History,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  ShieldCheck,
  FileText,
  Plus,
  Trash2,
  Laptop,
  Award,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  Download,
  Upload,
} from 'lucide-react';

export const EmployeeDetailModal = ({ employeeId, onClose, onUpdated, isInline = false }) => {
  const { hasRole, user: currentUser } = useAuth();
  const canManage = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN') || hasRole('HR_EXECUTIVE');

  const [data360, setData360] = useState(null);
  const targetEmpId = data360?.employee?._id || employeeId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'leaves' | 'attendance' | 'payroll' | 'documents' | 'assets' | 'history'

  // Invitation state
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteLink, setInviteLink] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Admin Leave Application state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveFormData, setLeaveFormData] = useState({
    leaveTypeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isHalfDay: false,
    reason: '',
    autoApprove: true,
  });
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState(null);
  const [leaveSuccess, setLeaveSuccess] = useState(null);

  // Document Upload state
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docFormData, setDocFormData] = useState({
    docType: 'ID_PROOF',
    title: '',
    fileName: '',
    status: 'VERIFIED',
    notes: '',
  });
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState(null);

  // Lifecycle Transfer state
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [transferData, setTransferData] = useState({
    changeType: 'TRANSFER',
    effectiveDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    designationId: '',
    locationId: '',
    managerId: '',
    status: '',
    notes: '',
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState(null);

  useEffect(() => {
    fetch360Profile();
    loadLeaveTypes();
  }, [employeeId]);

  const fetch360Profile = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/employees/${employeeId}/360-summary`);
      setData360(res.data.data);
    } catch (err) {
      setError(err.message || 'Failed to load employee 360 profile');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaveTypes = async () => {
    try {
      const res = await api.get('/leave/types');
      setLeaveTypes(res.data.data || []);
      if (res.data.data?.length > 0) {
        setLeaveFormData((prev) => ({ ...prev, leaveTypeId: res.data.data[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load leave types:', err);
    }
  };

  const handleResendInvite = async () => {
    try {
      setInviteSending(true);
      setInviteSuccess(null);
      const res = await api.post(`/employees/${targetEmpId}/resend-invite`);
      setInviteSuccess(res.data?.message || 'Welcome invitation email successfully dispatched!');
      if (res.data?.data?.activationUrl) {
        setInviteLink(res.data.data.activationUrl);
      }
    } catch (err) {
      alert(err.message || 'Failed to dispatch welcome invitation');
    } finally {
      setInviteSending(false);
    }
  };

  const handleAdminRecordLeave = async (e) => {
    e.preventDefault();
    try {
      setLeaveLoading(true);
      setLeaveError(null);
      await api.post(`/employees/${targetEmpId}/admin-leave`, leaveFormData);
      setLeaveSuccess('Leave successfully applied and debited from employee balance!');
      setShowLeaveModal(false);
      setLeaveFormData({
        leaveTypeId: leaveTypes[0]?._id || '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        isHalfDay: false,
        reason: '',
        autoApprove: true,
      });
      await fetch360Profile();
      if (onUpdated) onUpdated();
    } catch (err) {
      setLeaveError(err.message || 'Failed to apply leave');
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile && !docFormData.title) {
      setDocError('Please select a document file to upload');
      return;
    }
    try {
      setDocLoading(true);
      setDocError(null);
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('docType', docFormData.docType);
      formData.append('title', docFormData.title || selectedFile?.name || 'Document');
      formData.append('status', docFormData.status);
      formData.append('notes', docFormData.notes);

      await api.post(`/employees/${targetEmpId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowDocModal(false);
      setSelectedFile(null);
      setDocFormData({ docType: 'ID_PROOF', title: '', fileName: '', status: 'VERIFIED', notes: '' });
      await fetch360Profile();
    } catch (err) {
      setDocError(err.message || 'Failed to upload document');
    } finally {
      setDocLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document record?')) return;
    try {
      await api.delete(`/employees/${targetEmpId}/documents/${docId}`);
      await fetch360Profile();
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleOpenTransfer = async () => {
    try {
      const [deptsRes, desigsRes, locsRes, empsRes] = await Promise.all([
        api.get('/organization/departments'),
        api.get('/organization/designations'),
        api.get('/organization/locations'),
        api.get('/employees?limit=100'),
      ]);
      setDepartments(deptsRes.data.data);
      setDesignations(desigsRes.data.data);
      setLocations(locsRes.data.data);
      setManagers(empsRes.data.data.filter((e) => e._id !== targetEmpId));

      const emp = data360?.employee;
      setTransferData({
        changeType: 'TRANSFER',
        effectiveDate: new Date().toISOString().split('T')[0],
        departmentId: emp?.departmentId?._id || '',
        designationId: emp?.designationId?._id || '',
        locationId: emp?.locationId?._id || '',
        managerId: emp?.managerId?._id || '',
        status: emp?.status || 'ACTIVE',
        notes: '',
      });
      setShowTransferForm(true);
    } catch (err) {
      console.error('Failed to load transition options:', err);
    }
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    try {
      setTransferLoading(true);
      setTransferError(null);
      await api.post(`/employees/${targetEmpId}/transfer`, transferData);
      setShowTransferForm(false);
      await fetch360Profile();
      if (onUpdated) onUpdated();
    } catch (err) {
      setTransferError(err.message || 'Failed to record transition');
    } finally {
      setTransferLoading(false);
    }
  };

  const emp = data360?.employee;
  const leaveInfo = data360?.leave;
  const attInfo = data360?.attendance;
  const payInfo = data360?.payroll;
  const assets = data360?.assets || [];
  const goals = data360?.goals || [];
  const docs = data360?.documents || [];
  const history = data360?.jobHistory || [];

  const modalContent = (
    <div className={isInline ? "bg-white rounded-2xl w-full p-6 border border-slate-200 shadow-xs flex flex-col" : "bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden"}>
      {/* Header Profile Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-xs shrink-0">
              {emp?.firstName?.[0]}
              {emp?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 truncate">
                  {emp?.firstName} {emp?.lastName}
                </h2>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-mono font-bold rounded-md border border-indigo-200">
                  {emp?.employeeCode}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    emp?.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : emp?.status === 'NOTICE_PERIOD'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {emp?.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {emp?.designationId?.title || 'Team Member'} • {emp?.departmentId?.name || 'General Department'} •{' '}
                {emp?.locationId?.name || 'Headquarters'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={inviteSending}
                  className="inline-flex items-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                  title="Dispatch Welcome Email with Activation Link"
                >
                  <Mail className="w-3.5 h-3.5 mr-1.5" />
                  {inviteSending ? 'Sending...' : 'Send Login Invite'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold transition"
                  title="Record leave requested via email or phone"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Record Leave
                </button>

                <button
                  type="button"
                  onClick={() => setShowDocModal(true)}
                  className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Doc
                </button>

                <button
                  type="button"
                  onClick={handleOpenTransfer}
                  className="inline-flex items-center px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold transition"
                >
                  <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                  Promote / Transfer
                </button>
              </>
            )}
            {!isInline && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 border-b border-slate-200 mt-2 shrink-0 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: '360° Overview', icon: UserCheck },
            { id: 'leaves', label: `Leaves & Quotas (${leaveInfo?.balances?.length || 0})`, icon: Calendar },
            { id: 'attendance', label: 'Attendance & Shifts', icon: Clock },
            { id: 'payroll', label: 'Compensation & Payslips', icon: CreditCard },
            { id: 'documents', label: `Documents (${docs.length})`, icon: FileText },
            { id: 'assets', label: `Assets & Goals (${assets.length + goals.length})`, icon: Laptop },
            { id: 'history', label: `Job History (${history.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowTransferForm(false);
                }}
                className={`flex items-center px-3 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id && !showTransferForm
                    ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notification Banners */}
        {inviteSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{inviteSuccess}</span>
              </div>
              <button onClick={() => setInviteSuccess(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
            </div>
            <p className="text-[11px] text-emerald-700">
              Email was delivered via SMTP to <strong>{emp?.workEmail}</strong> (inspect in Mailpit at http://localhost:8025).
            </p>
            {inviteLink && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Direct Activation Link:</span>
                <input
                  readOnly
                  value={inviteLink}
                  className="w-full text-[10px] font-mono bg-white border border-emerald-300 rounded px-2.5 py-1 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-xs rounded hover:bg-emerald-700 shrink-0"
                >
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            )}
          </div>
        )}

        {leaveSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex justify-between items-center">
            <div className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{leaveSuccess}</span>
            </div>
            <button onClick={() => setLeaveSuccess(null)} className="text-emerald-700 font-bold">✕</button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading comprehensive 360° employee profile...</div>
          ) : showTransferForm ? (
            /* Promotion / Transfer Lifecycle Form */
            <form onSubmit={handleExecuteTransfer} className="space-y-4 bg-slate-50/60 p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Execute Employee Lifecycle Transition</h3>
                  <p className="text-xs text-slate-500">Record a promotion, transfer, or status update with full audit tracking</p>
                </div>
                <button type="button" onClick={() => setShowTransferForm(false)} className="text-xs text-slate-500 hover:text-slate-800">
                  Cancel
                </button>
              </div>

              {transferError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{transferError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transition Type *</label>
                  <select
                    value={transferData.changeType}
                    onChange={(e) => setTransferData({ ...transferData, changeType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="PROMOTION">Promotion</option>
                    <option value="TRANSFER">Departmental Transfer</option>
                    <option value="SALARY_REVISION">Salary Revision</option>
                    <option value="STATUS_CHANGE">Status Change</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={transferData.effectiveDate}
                    onChange={(e) => setTransferData({ ...transferData, effectiveDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                  </input>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={transferData.departmentId}
                    onChange={(e) => setTransferData({ ...transferData, departmentId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <select
                    value={transferData.designationId}
                    onChange={(e) => setTransferData({ ...transferData, designationId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value="">No Designation</option>
                    {designations.map((d) => (
                      <option key={d._id} value={d._id}>{d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Justification Notes</label>
                <textarea
                  rows="2"
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="Reason for lifecycle transition..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {transferLoading ? 'Saving...' : 'Apply Lifecycle Transition'}
                </button>
              </div>
            </form>
          ) : activeTab === 'overview' ? (
            /* TAB 1: 360° OVERVIEW */
            <div className="space-y-4">
              {/* Top Quick Status Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Employment Status</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-bold text-sm text-slate-900">{emp?.status}</span>
                    <span className="text-xs text-slate-500">({emp?.employmentType})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Joined: {emp?.joiningDate?.slice(0, 10)}</p>
                </div>

                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                  <span className="text-[11px] font-semibold text-indigo-700 uppercase">Leave Available</span>
                  <p className="text-xl font-bold text-indigo-950 mt-1">
                    {leaveInfo?.balances?.reduce((acc, b) => acc + (b.category !== 'UNPAID' ? b.balance : 0), 0) || 0} Days
                  </p>
                  <p className="text-[11px] text-indigo-600 mt-1">Across CL, SL & Earned Leaves</p>
                </div>

                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase">
                      Past Month Salary
                    </span>
                    <span className="text-[10px] text-emerald-800 font-medium">
                      {payInfo?.pastMonthName || 'Preceding Month'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-bold text-sm text-emerald-950">
                      {payInfo?.isPastMonthCredited
                        ? `₹${payInfo.pastMonthPayslip?.netPay?.toLocaleString('en-IN')}`
                        : payInfo?.latestPayslip
                        ? `₹${payInfo.latestPayslip.netPay?.toLocaleString('en-IN')}`
                        : 'No cycle run'}
                    </span>
                    {payInfo?.isPastMonthCredited ? (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        CREDITED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                        PENDING
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {payInfo?.isPastMonthCredited
                      ? `Paid for ${payInfo.pastMonthName}`
                      : `Last credited: ${payInfo?.latestPayslip?.period?.periodString || 'None'}`}
                  </p>
                </div>

                <div className="bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                  <span className="text-[11px] font-semibold text-purple-700 uppercase">Records & Verification</span>
                  <p className="text-xl font-bold text-purple-950 mt-1">{docs.length} Verified Docs</p>
                  <p className="text-[11px] text-purple-600 mt-1">{assets.length} Company Assets Assigned</p>
                </div>
              </div>

              {/* Personnel Information Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Official Personnel Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Official Work Email:</span>
                      <span className="font-medium text-slate-900">{emp?.workEmail}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Phone Contact:</span>
                      <span className="font-medium text-slate-900">{emp?.phone || 'Not Provided'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Reporting Manager:</span>
                      <span className="font-medium text-slate-900">{emp?.managerId?.firstName ? `${emp.managerId.firstName} ${emp.managerId.lastName}` : 'Direct Executive Report'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-medium text-slate-900">{emp?.departmentId?.name || 'General Department'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Job Title:</span>
                      <span className="font-medium text-slate-900">{emp?.designationId?.title || 'Standard'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Assigned Work Location:</span>
                      <span className="font-medium text-slate-900">{emp?.locationId?.name || 'Headquarters'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Emergency Contact Information</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Contact Name:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{emp?.emergencyContact?.name || 'Not on file'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Relationship:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{emp?.emergencyContact?.relation || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Emergency Phone:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{emp?.emergencyContact?.phone || 'Not on file'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'leaves' ? (
            /* TAB 2: LEAVES & QUOTAS */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Annual Leave Balances & Quotas ({leaveInfo?.currentYear})</h3>
                  <p className="text-xs text-slate-500">Double-entry ledger balances tracked per statutory policy</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Record Leave on Employee Request
                  </button>
                )}
              </div>

              {/* Leave Quota Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {leaveInfo?.balances?.map((b) => (
                  <div key={b.code} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-slate-700">{b.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{b.code}</span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-indigo-600">{b.balance}</span>
                      <span className="text-[11px] text-slate-400">Quota: {b.annualQuota}d</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{b.isPaid ? 'Paid Leave' : 'Unpaid (LWP)'}</p>
                  </div>
                ))}
              </div>

              {/* Recent Leave Requests */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Recent Leave Applications & Requests
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Leave Type</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Days</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaveInfo?.recentRequests?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">No leave requests found.</td>
                        </tr>
                      ) : (
                        leaveInfo?.recentRequests?.map((req) => (
                          <tr key={req._id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{req.leaveTypeId?.name || 'Leave'}</td>
                            <td className="py-2.5 px-3">{req.startDate} to {req.endDate}</td>
                            <td className="py-2.5 px-3 font-bold text-indigo-600">{req.deductedDays}d</td>
                            <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{req.reason || '-'}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'attendance' ? (
            /* TAB 3: ATTENDANCE & SHIFTS */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance & Shift Assignment</h3>
                  <p className="text-xs text-slate-500">Live check-in logs and monthly operational metrics</p>
                </div>
                <div className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                  Shift: {attInfo?.assignedShift?.name || 'General Shift'} ({attInfo?.assignedShift?.startTime} - {attInfo?.assignedShift?.endTime})
                </div>
              </div>

              {/* Monthly Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Present</span>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{attInfo?.stats?.present || 0} Days</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Absent</span>
                  <p className="text-xl font-bold text-rose-600 mt-1">{attInfo?.stats?.absent || 0} Days</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Half-Day</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">{attInfo?.stats?.halfDay || 0} Days</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Leave</span>
                  <p className="text-xl font-bold text-indigo-600 mt-1">{attInfo?.stats?.onLeave || 0} Days</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Holidays</span>
                  <p className="text-xl font-bold text-purple-600 mt-1">{attInfo?.stats?.holiday || 0} Days</p>
                </div>
              </div>

              {/* Recent Days Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Recent Attendance Days
                </div>
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">First In</th>
                      <th className="py-2.5 px-3">Last Out</th>
                      <th className="py-2.5 px-3">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attInfo?.recentDays?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">No punch records found for this period.</td>
                      </tr>
                    ) : (
                      attInfo?.recentDays?.map((d) => (
                        <tr key={d._id}>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{d.date?.slice(0, 10)}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{d.firstIn ? new Date(d.firstIn).toLocaleTimeString() : '-'}</td>
                          <td className="py-2.5 px-3 text-slate-500">{d.lastOut ? new Date(d.lastOut).toLocaleTimeString() : '-'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{d.totalWorkMinutes ? `${Math.round(d.totalWorkMinutes / 60)} hrs` : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'payroll' ? (
            /* TAB 4: PAYROLL & PAST CREDITED PAYSLIPS */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Salary Disbursement Status</span>
                  <h4 className="text-base font-bold text-emerald-950 mt-0.5">
                    {payInfo?.isPastMonthCredited
                      ? `✅ Salary Credited for ${payInfo.latestPayslip?.period?.periodString}`
                      : '⏳ Current Payroll Cycle in Preparation'}
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {payInfo?.latestPayslip
                      ? `Net pay amount: ₹${payInfo.latestPayslip.netPay?.toLocaleString('en-IN')} • Status: ${payInfo.latestPayslip.status}`
                      : 'No finalized payslips available yet.'}
                  </p>
                </div>
                {payInfo?.latestPayslip && (
                  <span className="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-2xs">
                    Credited
                  </span>
                )}
              </div>

              {/* Compensation Breakdown */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Compensation Structure</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Annual CTC:</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      ₹{Number(payInfo?.compensation?.annualCtc || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Monthly Gross:</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      ₹{Number(payInfo?.compensation?.monthlyGross || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Basic Pay:</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      ₹{Number(payInfo?.compensation?.components?.find(c => c.code === 'BASIC')?.monthlyAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-slate-500">Monthly Net (Est):</span>
                    <p className="text-base font-bold text-emerald-700 mt-0.5">
                      ₹{Number(payInfo?.latestPayslip?.netPay || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Past Payslips Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Past Monthly Payslip Records
                </div>
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Gross Earnings</th>
                      <th className="py-2.5 px-3">Deductions</th>
                      <th className="py-2.5 px-3">Net Pay</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payInfo?.payslips?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">No payslips generated yet.</td>
                      </tr>
                    ) : (
                      payInfo?.payslips?.map((p) => (
                        <tr key={p._id}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{p.period?.periodString}</td>
                          <td className="py-2.5 px-3 font-semibold">₹{Number(p.grossEarnings || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-rose-600">₹{Number(p.totalDeductions || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">₹{Number(p.netPay || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'documents' ? (
            /* TAB 5: EMPLOYEE DOCUMENTS & COMPLIANCE */
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Submitted Employee Documents & Verification</h3>
                  <p className="text-xs text-slate-500">Aadhaar, PAN, Resume, Offer letters and educational certificates</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => setShowDocModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload / Add Document
                  </button>
                )}
              </div>

              {docs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No documents uploaded yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Upload verified ID proof, resume, and certificates to complete file.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {docs.map((d) => (
                    <div
                      key={d._id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mb-1">
                              {d.docType?.replace(/_/g, ' ')}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">{d.title}</h4>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{d.fileName || 'document.pdf'}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            d.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {d.status || 'VERIFIED'}
                        </span>
                      </div>

                      {d.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          Notes: {d.notes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center space-x-2">
                          <span>{d.fileSize || 'File Document'}</span>
                          <span>•</span>
                          <span>Uploaded: {d.uploadedAt?.slice(0, 10)}</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {d.fileUrl && (
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                              title="Inspect or download document file"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              View / Download
                            </a>
                          )}
                          {canManage && (
                            <button
                              onClick={() => handleDeleteDocument(d._id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title="Remove document from profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'assets' ? (
            /* TAB 6: ASSETS & OKRS */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Assigned Company Assets</h3>
                <p className="text-xs text-slate-500">Hardware, laptops, and peripheral custody</p>
                <div className="mt-3">
                  {assets.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hardware assets currently allocated.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {assets.map((a) => (
                        <div key={a._id} className="p-3 bg-white border border-slate-200 rounded-xl">
                          <p className="text-xs font-bold text-slate-900">{a.name}</p>
                          <p className="text-[11px] font-mono text-indigo-600 font-bold">{a.assetTag} • {a.category}</p>
                          <p className="text-[11px] text-slate-500 mt-1">Serial: {a.serialNumber || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Performance Goals & OKRs</h3>
                <p className="text-xs text-slate-500">Active annual objectives</p>
                <div className="mt-3 space-y-2">
                  {goals.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No performance goals assigned.</p>
                  ) : (
                    goals.map((g) => (
                      <div key={g._id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{g.title}</span>
                          <span className="text-indigo-600">{g.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${g.progressPercentage}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 7: JOB HISTORY */
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Chronological Job History</h3>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No historical events recorded.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h._id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-indigo-700">{h.changeType}</span>
                        <span className="text-slate-400">{h.effectiveDate?.slice(0, 10)}</span>
                      </div>
                      <p className="text-slate-600">{h.notes || 'Status / assignment revision'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!isInline && (
          <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Close 360° Profile
            </button>
          </div>
        )}
      </div>
  );

  return (
    <>
      {isInline ? (
        <div className="w-full">
          {modalContent}
        </div>
      ) : (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50">
          {modalContent}
        </div>
      )}

      {/* SUB-MODAL 1: RECORD LEAVE ON BEHALF OF EMPLOYEE */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Record Leave for {emp?.firstName}</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleAdminRecordLeave} className="space-y-3 mt-4 text-xs">
              {leaveError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {leaveError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
                <select
                  required
                  value={leaveFormData.leaveTypeId}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, leaveTypeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {leaveTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.startDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveFormData.endDate}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Communication Notes *</label>
                <textarea
                  required
                  rows="2"
                  value={leaveFormData.reason}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  placeholder="e.g. Employee requested leave via email due to family function"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoApprove"
                  checked={leaveFormData.autoApprove}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, autoApprove: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="autoApprove" className="font-semibold text-slate-700">
                  Directly Approve & Debit from Ledger
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveLoading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {leaveLoading ? 'Recording...' : 'Apply Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: UPLOAD EMPLOYEE DOCUMENT */}
      {showDocModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Document for {emp?.firstName}</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3 mt-4 text-xs">
              {docError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {docError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Category *</label>
                <select
                  required
                  value={docFormData.docType}
                  onChange={(e) => setDocFormData({ ...docFormData, docType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="ID_PROOF">Government ID Proof (Aadhaar / Voter ID)</option>
                  <option value="PAN_CARD">PAN Card</option>
                  <option value="RESUME">Resume / Curriculum Vitae</option>
                  <option value="OFFER_LETTER">Signed Offer Letter</option>
                  <option value="EDUCATION_CERTIFICATE">Educational Degree Certificate</option>
                  <option value="RELIEVING_LETTER">Previous Relieving Letter</option>
                  <option value="BANK_PASSBOOK">Bank Account Verification</option>
                  <option value="OTHER">Other Official Document</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload Document File (PDF, DOCX, DOC, JPG, PNG) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                    if (file && !docFormData.title) {
                      setDocFormData((prev) => ({
                        ...prev,
                        title: file.name.replace(/\.[^/.]+$/, ''),
                      }));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-300 rounded-lg p-1.5 bg-white"
                />
                {selectedFile && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Display Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aadhaar Card Copy or Master Degree"
                  value={docFormData.title}
                  onChange={(e) => setDocFormData({ ...docFormData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification Status</label>
                <select
                  value={docFormData.status}
                  onChange={(e) => setDocFormData({ ...docFormData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="VERIFIED">Verified & Approved</option>
                  <option value="PENDING">Pending Review</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Verification Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Verified against original copy"
                  value={docFormData.notes}
                  onChange={(e) => setDocFormData({ ...docFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docLoading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg disabled:opacity-50"
                >
                  {docLoading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeDetailModal;
