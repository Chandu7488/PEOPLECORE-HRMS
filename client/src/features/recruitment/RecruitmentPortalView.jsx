import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  Briefcase,
  Users,
  UserPlus,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Star,
  FileText,
  Building,
  DollarSign,
  TrendingUp,
  XCircle,
  AlertCircle,
  Award,
  ChevronRight,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';

/**
 * Recruitment & ATS Portal View
 * Implements Job Requisitions, Applicant Tracking Pipeline, and 1-Click Employee Onboarding
 */
export const RecruitmentPortalView = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('requisitions'); // 'requisitions' | 'candidates'

  // Data states
  const [requisitions, setRequisitions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters
  const [reqStatusFilter, setReqStatusFilter] = useState('ALL');
  const [candidateReqFilter, setCandidateReqFilter] = useState('ALL');
  const [candidateStageFilter, setCandidateStageFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateReqModal, setShowCreateReqModal] = useState(false);
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showEvalModal, setShowEvalModal] = useState(false);

  // Form states - Requisition
  const [reqForm, setReqForm] = useState({
    title: '',
    departmentId: '',
    designationId: '',
    openingsCount: 1,
    experienceMin: 2,
    experienceMax: 5,
    budgetMin: 800000,
    budgetMax: 1500000,
    priority: 'MEDIUM',
    employmentType: 'FULL_TIME',
    jobDescription: '',
    skills: '',
  });

  // Form states - Candidate
  const [candidateForm, setCandidateForm] = useState({
    requisitionId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    totalExperience: 3,
    currentCompany: '',
    currentCtc: 600000,
    expectedCtc: 900000,
    noticePeriodDays: 30,
    resumeUrl: '',
    source: 'PORTAL',
    notes: '',
  });

  // Form states - Onboard Conversion
  const [convertForm, setConvertForm] = useState({
    workEmail: '',
    joiningDate: new Date().toISOString().split('T')[0],
    departmentId: '',
    designationId: '',
    employmentType: 'FULL_TIME',
  });

  // Form states - Evaluation
  const [evalForm, setEvalForm] = useState({
    stage: 'INTERVIEW',
    evaluatorName: `${user?.firstName || 'HR'} ${user?.lastName || 'Panel'}`,
    score: 5,
    feedback: '',
  });

  const isPrivileged =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('RECRUITER');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reqRes, candRes, deptsRes, desigsRes] = await Promise.all([
        api.get('/recruitment/requisitions'),
        api.get('/recruitment/candidates'),
        api.get('/organization/departments'),
        api.get('/organization/designations'),
      ]);

      const reqList = reqRes.data.data || [];
      const candList = candRes.data.data || [];
      const deptList = deptsRes.data.data || [];
      const desigList = desigsRes.data.data || [];

      setRequisitions(reqList);
      setCandidates(candList);
      setDepartments(deptList);
      setDesignations(desigList);

      if (deptList.length > 0) {
        setReqForm((prev) => ({ ...prev, departmentId: prev.departmentId || deptList[0]._id }));
      }
      if (reqList.length > 0) {
        setCandidateForm((prev) => ({ ...prev, requisitionId: prev.requisitionId || reqList[0]._id }));
      }
    } catch (err) {
      setError(err.message || 'Failed to load recruitment data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequisition = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/recruitment/requisitions', reqForm);
      setSuccessMsg(`Requisition ${res.data.data.requisitionCode} created successfully`);
      setShowCreateReqModal(false);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to create job requisition');
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/recruitment/candidates', candidateForm);
      setSuccessMsg(`Candidate application registered for ${candidateForm.firstName} ${candidateForm.lastName}`);
      setShowAddCandidateModal(false);
      setCandidateForm({
        requisitionId: requisitions[0]?._id || '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        totalExperience: 3,
        currentCompany: '',
        currentCtc: 600000,
        expectedCtc: 900000,
        noticePeriodDays: 30,
        resumeUrl: '',
        source: 'PORTAL',
        notes: '',
      });
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to register candidate');
    }
  };

  const handleUpdateStage = async (candidateId, nextStage, extraData = {}) => {
    try {
      await api.put(`/recruitment/candidates/${candidateId}/stage`, {
        stage: nextStage,
        ...extraData,
      });
      setSuccessMsg(`Candidate stage updated to ${nextStage}`);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to update candidate stage');
    }
  };

  const openConvertModal = (candidate) => {
    setSelectedCandidate(candidate);
    setConvertForm({
      workEmail: candidate.email.includes('@peoplecore')
        ? candidate.email
        : `${candidate.firstName.toLowerCase()}.${candidate.lastName.toLowerCase()}@peoplecore.local`,
      joiningDate: candidate.offerDetails?.joiningDate
        ? new Date(candidate.offerDetails.joiningDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      departmentId: candidate.requisitionId?.departmentId?._id || candidate.requisitionId?.departmentId || '',
      designationId: candidate.requisitionId?.designationId || '',
      employmentType: 'FULL_TIME',
    });
    setShowConvertModal(true);
  };

  const handleConvertCandidate = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      const res = await api.post(`/recruitment/candidates/${selectedCandidate._id}/convert`, convertForm);
      setSuccessMsg(res.data.message || 'Candidate converted to active employee record!');
      setShowConvertModal(false);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to convert candidate');
    }
  };

  const openEvaluationModal = (candidate) => {
    setSelectedCandidate(candidate);
    setEvalForm({
      stage: candidate.stage,
      evaluatorName: `${user?.firstName || 'HR'} ${user?.lastName || 'Panel'}`,
      score: 5,
      feedback: '',
    });
    setShowEvalModal(true);
  };

  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      await api.put(`/recruitment/candidates/${selectedCandidate._id}/stage`, {
        stage: selectedCandidate.stage,
        rating: evalForm.score,
        newEvaluation: evalForm,
      });
      setSuccessMsg('Evaluation notes recorded successfully');
      setShowEvalModal(false);
      fetchInitialData();
    } catch (err) {
      setError(err.message || 'Failed to record evaluation');
    }
  };

  // KPI Metrics
  const totalOpenReqs = requisitions.filter((r) => r.status === 'OPEN').length;
  const totalOpenings = requisitions.reduce((acc, r) => acc + (r.openingsCount || 0), 0);
  const activeCandidates = candidates.filter((c) => !['HIRED', 'REJECTED'].includes(c.stage)).length;
  const hiredCount = candidates.filter((c) => c.stage === 'HIRED').length;

  const filteredRequisitions = requisitions.filter((r) => {
    if (reqStatusFilter !== 'ALL' && r.status !== reqStatusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.title?.toLowerCase().includes(term) ||
        r.requisitionCode?.toLowerCase().includes(term) ||
        r.departmentId?.name?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const filteredCandidates = candidates.filter((c) => {
    if (candidateReqFilter !== 'ALL' && c.requisitionId?._id !== candidateReqFilter) return false;
    if (candidateStageFilter !== 'ALL' && c.stage !== candidateStageFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        c.firstName?.toLowerCase().includes(term) ||
        c.lastName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.currentCompany?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStageBadgeColor = (stage) => {
    switch (stage) {
      case 'APPLIED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SCREENING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INTERVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OFFERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'HIRED':
        return 'bg-green-100 text-green-800 border-green-300 font-bold';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'FILLED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CLOSED':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
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

      {/* Header and Hero KPI Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center">
                <Briefcase className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Talent Acquisition & ATS
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">1-Click Employee Onboarding</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Recruitment & Applicant Pipeline</h1>
            <p className="text-slate-600 text-sm mt-1">
              Manage job requisitions, evaluate candidate applications through screening and interviews, and convert hired talent directly into the workforce.
            </p>
          </div>

          {isPrivileged && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowCreateReqModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Requisition</span>
              </button>
              <button
                onClick={() => setShowAddCandidateModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Candidate</span>
              </button>
            </div>
          )}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            <p className="text-xs font-semibold text-slate-500">Active Requisitions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalOpenReqs}</p>
            <p className="text-xs text-slate-400 mt-1">Open positions currently hiring</p>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            <p className="text-xs font-semibold text-slate-500">Total Openings</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{totalOpenings}</p>
            <p className="text-xs text-slate-400 mt-1">Approved headcounts across teams</p>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            <p className="text-xs font-semibold text-slate-500">Active Candidates</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{activeCandidates}</p>
            <p className="text-xs text-slate-400 mt-1">In screening, interview & offer</p>
          </div>

          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
            <p className="text-xs font-semibold text-slate-500">Hired Talent</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{hiredCount}</p>
            <p className="text-xs text-slate-400 mt-1">Successfully onboarded</p>
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('requisitions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'requisitions'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Job Requisitions ({requisitions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'candidates'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Candidate Pipeline ({candidates.length})</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'requisitions' ? 'Search jobs...' : 'Search candidates...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56"
            />
          </div>

          {activeTab === 'requisitions' ? (
            <select
              value={reqStatusFilter}
              onChange={(e) => setReqStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="DRAFT">Draft</option>
              <option value="FILLED">Filled</option>
              <option value="CLOSED">Closed</option>
            </select>
          ) : (
            <>
              <select
                value={candidateStageFilter}
                onChange={(e) => setCandidateStageFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Stages</option>
                <option value="APPLIED">Applied</option>
                <option value="SCREENING">Screening</option>
                <option value="INTERVIEW">Interview</option>
                <option value="OFFERED">Offered</option>
                <option value="HIRED">Hired</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={candidateReqFilter}
                onChange={(e) => setCandidateReqFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden max-w-44 truncate"
              >
                <option value="ALL">All Positions</option>
                {requisitions.map((req) => (
                  <option key={req._id} value={req._id}>
                    {req.title}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Tab 1: Job Requisitions */}
      {activeTab === 'requisitions' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Open Job Requisitions</h3>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredRequisitions.length} of {requisitions.length} positions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Code & Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Headcount (Filled / Total)</th>
                  <th className="py-3 px-4">Pipeline Breakdown</th>
                  <th className="py-3 px-4">Budget Range</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No job requisitions match the current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRequisitions.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[11px] font-bold text-indigo-600">{req.requisitionCode}</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{req.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
                          <span>{req.employmentType}</span>
                          <span>•</span>
                          <span>{req.experienceMin}-{req.experienceMax} yrs exp</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {req.departmentId?.name || 'General'}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {req.designationId?.title || 'Standard'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">
                            {req.filledCount || 0} / {req.openingsCount}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({Math.round(((req.filledCount || 0) / req.openingsCount) * 100)}%)
                          </span>
                        </div>
                        <div className="w-28 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((req.filledCount || 0) / req.openingsCount) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200">
                            App: {req.stageBreakdown?.APPLIED || 0}
                          </span>
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-purple-200">
                            Int: {req.stageBreakdown?.INTERVIEW || 0}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                            Off: {req.stageBreakdown?.OFFERED || 0}
                          </span>
                          <span className="bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-300">
                            Hired: {req.stageBreakdown?.HIRED || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        ₹{(req.budgetMin / 100000).toFixed(1)}L - ₹{(req.budgetMax / 100000).toFixed(1)}L
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeColor(req.status)}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setCandidateReqFilter(req._id);
                            setActiveTab('candidates');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold inline-flex items-center space-x-1"
                        >
                          <span>View ATS</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Candidate Pipeline (ATS) */}
      {activeTab === 'candidates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                No candidate applications match the selected position and stage filters.
              </div>
            ) : (
              filteredCandidates.map((c) => (
                <div
                  key={c._id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top candidate badge row */}
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStageBadgeColor(c.stage)}`}>
                        {c.stage}
                      </span>
                      {c.rating && (
                        <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-700 text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{c.rating}/5</span>
                        </div>
                      )}
                    </div>

                    {/* Candidate Name & Contact */}
                    <h4 className="text-base font-bold text-slate-900 mt-2">
                      {c.firstName} {c.lastName}
                    </h4>
                    <p className="text-xs text-slate-500">{c.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{c.phone}</p>

                    {/* Target Requisition */}
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Applied Position</p>
                      <p className="font-semibold text-slate-800 truncate mt-0.5">
                        {c.requisitionId?.title || 'Open Position'}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Exp: {c.totalExperience} yrs</span>
                        <span>Company: {c.currentCompany || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Expected CTC & Notice */}
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 px-1">
                      <span>Exp CTC: ₹{(c.expectedCtc / 100000).toFixed(1)}L</span>
                      <span>Notice: {c.noticePeriodDays} days</span>
                    </div>

                    {/* Converted Employee Badge */}
                    {c.convertedEmployeeId && (
                      <div className="mt-3 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold">Onboarded as Employee</p>
                          <p className="text-[11px] text-emerald-700 font-mono">
                            Code: {c.convertedEmployeeId.employeeCode}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions & Next Stage Progression */}
                  {isPrivileged && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      {c.stage === 'APPLIED' && (
                        <button
                          onClick={() => handleUpdateStage(c._id, 'SCREENING')}
                          className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1"
                        >
                          <span>Screen</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {c.stage === 'SCREENING' && (
                        <button
                          onClick={() => handleUpdateStage(c._id, 'INTERVIEW')}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1"
                        >
                          <span>Interview</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {c.stage === 'INTERVIEW' && (
                        <>
                          <button
                            onClick={() => openEvaluationModal(c)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded-lg text-xs font-semibold"
                          >
                            Feedback
                          </button>
                          <button
                            onClick={() => handleUpdateStage(c._id, 'OFFERED', { offerDetails: { offeredCtc: c.expectedCtc || 1000000 } })}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1"
                          >
                            <span>Make Offer</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      {(c.stage === 'OFFERED' || c.stage === 'HIRED') && !c.convertedEmployeeId && (
                        <button
                          onClick={() => openConvertModal(c)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>1-Click Onboard</span>
                        </button>
                      )}

                      {!['HIRED', 'REJECTED'].includes(c.stage) && (
                        <button
                          onClick={() => handleUpdateStage(c._id, 'REJECTED')}
                          className="text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-medium ml-auto"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Job Requisition */}
      {showCreateReqModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Briefcase className="w-5 h-5 text-indigo-600 mr-2" />
              Create Job Requisition
            </h3>
            <p className="text-xs text-slate-500 mt-1">Open a new position headcount approval with custom budget.</p>

            <form onSubmit={handleCreateRequisition} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  value={reqForm.title}
                  onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Department *</label>
                  <select
                    required
                    value={reqForm.departmentId}
                    onChange={(e) => setReqForm({ ...reqForm, departmentId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    {departments.length === 0 ? (
                      <option value="">No departments configured</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Designation</label>
                  <select
                    value={reqForm.designationId}
                    onChange={(e) => setReqForm({ ...reqForm, designationId: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="">Standard Level</option>
                    {designations.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Openings Count</label>
                  <input
                    type="number"
                    min="1"
                    value={reqForm.openingsCount}
                    onChange={(e) => setReqForm({ ...reqForm, openingsCount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Min Exp (Yrs)</label>
                  <input
                    type="number"
                    min="0"
                    value={reqForm.experienceMin}
                    onChange={(e) => setReqForm({ ...reqForm, experienceMin: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Max Exp (Yrs)</label>
                  <input
                    type="number"
                    min="1"
                    value={reqForm.experienceMax}
                    onChange={(e) => setReqForm({ ...reqForm, experienceMax: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Budget Min (INR)</label>
                  <input
                    type="number"
                    value={reqForm.budgetMin}
                    onChange={(e) => setReqForm({ ...reqForm, budgetMin: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Budget Max (INR)</label>
                  <input
                    type="number"
                    value={reqForm.budgetMax}
                    onChange={(e) => setReqForm({ ...reqForm, budgetMax: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="React, Node.js, TypeScript, Tailwind"
                  value={reqForm.skills}
                  onChange={(e) => setReqForm({ ...reqForm, skills: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Job Description</label>
                <textarea
                  rows="2"
                  value={reqForm.jobDescription}
                  onChange={(e) => setReqForm({ ...reqForm, jobDescription: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateReqModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Publish Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Candidate Application */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <UserPlus className="w-5 h-5 text-indigo-600 mr-2" />
              Register Candidate Application
            </h3>
            <p className="text-xs text-slate-500 mt-1">Add applicant details into the talent tracking pipeline.</p>

            <form onSubmit={handleAddCandidate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Target Requisition *</label>
                <select
                  required
                  value={candidateForm.requisitionId}
                  onChange={(e) => setCandidateForm({ ...candidateForm, requisitionId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  {requisitions.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.requisitionCode} - {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">First Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.firstName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={candidateForm.lastName}
                    onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Phone</label>
                  <input
                    type="text"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Experience (Yrs)</label>
                  <input
                    type="number"
                    value={candidateForm.totalExperience}
                    onChange={(e) => setCandidateForm({ ...candidateForm, totalExperience: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Current Company</label>
                  <input
                    type="text"
                    value={candidateForm.currentCompany}
                    onChange={(e) => setCandidateForm({ ...candidateForm, currentCompany: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Notice (Days)</label>
                  <input
                    type="number"
                    value={candidateForm.noticePeriodDays}
                    onChange={(e) => setCandidateForm({ ...candidateForm, noticePeriodDays: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 1-Click Candidate to Employee Onboarding */}
      {showConvertModal && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit border border-emerald-200 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Automated Workforce Onboarding</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Onboard {selectedCandidate.firstName} {selectedCandidate.lastName}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Creates an official Employee profile, generates unique code, and auto-provisions annual leave quotas in the ledger.
            </p>

            <form onSubmit={handleConvertCandidate} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Official Work Email *</label>
                <input
                  type="email"
                  required
                  value={convertForm.workEmail}
                  onChange={(e) => setConvertForm({ ...convertForm, workEmail: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Official Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={convertForm.joiningDate}
                    onChange={(e) => setConvertForm({ ...convertForm, joiningDate: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Employment Type</label>
                  <select
                    value={convertForm.employmentType}
                    onChange={(e) => setConvertForm({ ...convertForm, employmentType: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Onboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Interview Feedback */}
      {showEvalModal && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Star className="w-5 h-5 text-amber-500 mr-2" />
              Interview Evaluation
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Feedback notes for {selectedCandidate.firstName} {selectedCandidate.lastName}
            </p>

            <form onSubmit={handleSubmitEvaluation} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Overall Rating (1 to 5 Stars)</label>
                <div className="flex items-center space-x-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEvalForm({ ...evalForm, score: star })}
                      className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          evalForm.score >= star
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-700 ml-2">{evalForm.score} / 5</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Evaluator Name</label>
                <input
                  type="text"
                  required
                  value={evalForm.evaluatorName}
                  onChange={(e) => setEvalForm({ ...evalForm, evaluatorName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Technical / Cultural Notes</label>
                <textarea
                  rows="3"
                  required
                  placeholder="System design strength, communication skills, compensation alignment..."
                  value={evalForm.feedback}
                  onChange={(e) => setEvalForm({ ...evalForm, feedback: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEvalModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Save Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
