import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  Target,
  Laptop,
  Receipt,
  LifeBuoy,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Star,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Send,
  Building,
  User,
  Tag,
  Check,
} from 'lucide-react';

/**
 * Company Operations Portal View (Phase 7)
 * Consolidates Performance OKRs, Company Assets, Expense Reimbursements, and Helpdesk Ticketing
 */
export const CompanyOperationsPortalView = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' | 'assets' | 'expenses' | 'helpdesk'

  // Data states
  const [goals, setGoals] = useState([]);
  const [assets, setAssets] = useState([]);
  const [claims, setClaims] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Forms
  const [goalForm, setGoalForm] = useState({
    title: '',
    category: 'PROJECT',
    description: '',
    targetDate: '',
    progressPercentage: 20,
    weightage: 25,
  });

  const [assetForm, setAssetForm] = useState({
    name: '',
    category: 'LAPTOP',
    serialNumber: '',
    cost: 85000,
    notes: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'TRAVEL',
    amount: 2500,
    expenseDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'IT_SUPPORT',
    priority: 'MEDIUM',
    description: '',
  });

  const isPrivileged =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('MANAGER');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'performance') {
        const res = await api.get('/performance/goals');
        setGoals(res.data.data || []);
      } else if (activeTab === 'assets') {
        const res = await api.get('/assets');
        setAssets(res.data.data || []);
      } else if (activeTab === 'expenses') {
        const res = await api.get('/expenses/claims');
        setClaims(res.data.data || []);
      } else if (activeTab === 'helpdesk') {
        const res = await api.get('/helpdesk/tickets');
        setTickets(res.data.data || []);
      }

      if (isPrivileged && employees.length === 0) {
        const empRes = await api.get('/employees');
        setEmployees(empRes.data.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load module data');
    } finally {
      setLoading(false);
    }
  };

  // Goal actions
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await api.post('/performance/goals', goalForm);
      setSuccessMsg('Performance Goal / OKR created successfully');
      setShowGoalModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create goal');
    }
  };

  const handleUpdateProgress = async (goalId, newProgress) => {
    try {
      await api.put(`/performance/goals/${goalId}/progress`, { progressPercentage: newProgress });
      setSuccessMsg(`Goal progress updated to ${newProgress}%`);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update progress');
    }
  };

  // Asset actions
  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      await api.post('/assets', assetForm);
      setSuccessMsg('Asset cataloged successfully');
      setShowAssetModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to catalog asset');
    }
  };

  // Expense actions
  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses/claims', expenseForm);
      setSuccessMsg('Expense reimbursement claim submitted');
      setShowExpenseModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to submit expense');
    }
  };

  const handleReviewExpense = async (claimId, status) => {
    try {
      await api.put(`/expenses/claims/${claimId}/review`, { status, remarks: `Reviewed as ${status}` });
      setSuccessMsg(`Expense claim ${status.toLowerCase()}`);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to review claim');
    }
  };

  // Helpdesk actions
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/helpdesk/tickets', ticketForm);
      setSuccessMsg('Support ticket submitted successfully');
      setShowTicketModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to submit ticket');
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      await api.put(`/helpdesk/tickets/${ticketId}`, { status: 'RESOLVED', resolutionNotes: 'Resolved by support team' });
      setSuccessMsg('Ticket marked as resolved');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update ticket');
    }
  };

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
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-200 flex items-center">
                <Target className="w-3.5 h-3.5 mr-1 text-violet-600" />
                Operations & Services Hub
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-mono">PMS, Assets, Expenses & Helpdesk</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">Operations & Employee Services</h1>
            <p className="text-slate-600 text-sm mt-1">
              Track annual performance goals & OKRs, manage IT hardware custody, submit travel reimbursement claims, and raise helpdesk support tickets.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'performance' && (
              <button
                onClick={() => setShowGoalModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Goal / OKR</span>
              </button>
            )}
            {activeTab === 'assets' && isPrivileged && (
              <button
                onClick={() => setShowAssetModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Asset</span>
              </button>
            )}
            {activeTab === 'expenses' && (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Claim Expense</span>
              </button>
            )}
            {activeTab === 'helpdesk' && (
              <button
                onClick={() => setShowTicketModal(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Raise Ticket</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'performance' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Goals & OKRs</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'assets' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Company Assets</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'expenses' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Reimbursements</span>
        </button>

        <button
          onClick={() => setActiveTab('helpdesk')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'helpdesk' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LifeBuoy className="w-4 h-4" />
          <span>Helpdesk Tickets</span>
        </button>
      </div>

      {/* Tab 1: Performance Goals & OKRs */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
              No performance goals found. Click "New Goal / OKR" to create one.
            </div>
          ) : (
            goals.map((goal) => (
              <div key={goal._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      {goal.category}
                    </span>
                    <span className="text-xs font-bold text-slate-500">Weight: {goal.weightage}%</span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">{goal.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{goal.description || 'No description provided'}</p>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Progress</span>
                      <span>{goal.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{ width: `${goal.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {goal.managerRating && (
                    <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                      <div className="flex items-center space-x-1 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Manager Rating: {goal.managerRating}/5</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5 italic">{goal.managerFeedback}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    goal.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {goal.status}
                  </span>

                  {goal.status !== 'COMPLETED' && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateProgress(goal._id, Math.min(100, goal.progressPercentage + 25))}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded-lg"
                      >
                        +25%
                      </button>
                      <button
                        onClick={() => handleUpdateProgress(goal._id, 100)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2 py-1 rounded-lg"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Company Assets */}
      {activeTab === 'assets' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Assigned & Cataloged Hardware Assets</h3>
            <span className="text-xs text-slate-500 font-medium">{assets.length} Assets Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                  <th className="py-3 px-4">Asset Tag & Device</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Cost (INR)</th>
                  <th className="py-3 px-4">Custody / Allocated To</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No assets found.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-indigo-600 font-bold">{asset.assetTag}</span>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{asset.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{asset.category}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{asset.serialNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold">₹{asset.cost?.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4">
                        {asset.allocatedTo ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {asset.allocatedTo.firstName} {asset.allocatedTo.lastName}
                            </span>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {asset.allocatedTo.employeeCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned (In IT Storage)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          asset.status === 'ALLOCATED' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Expense Reimbursements */}
      {activeTab === 'expenses' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Expense Reimbursement Claims</h3>
            <span className="text-xs text-slate-500 font-medium">{claims.length} Claims Logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                  <th className="py-3 px-4">Claim # & Title</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Expense Date</th>
                  <th className="py-3 px-4">Status</th>
                  {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No expense claims found.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-indigo-600 font-bold">{claim.claimNumber}</span>
                        <div className="font-bold text-slate-900 mt-0.5">{claim.title}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {claim.employeeId?.firstName} {claim.employeeId?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{claim.employeeId?.employeeCode}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{claim.category}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">₹{claim.amount?.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-slate-600">{new Date(claim.expenseDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          claim.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : claim.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      {isPrivileged && (
                        <td className="py-3.5 px-4 text-right">
                          {claim.status === 'SUBMITTED' && (
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleReviewExpense(claim._id, 'APPROVED')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md text-xs font-bold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewExpense(claim._id, 'REJECTED')}
                                className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-2 py-1 rounded-md text-xs font-semibold"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Helpdesk Tickets */}
      {activeTab === 'helpdesk' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Internal Support Tickets</h3>
            <span className="text-xs text-slate-500 font-medium">{tickets.length} Tickets Raised</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-600">
                  <th className="py-3 px-4">Ticket # & Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Raised By</th>
                  <th className="py-3 px-4">Status</th>
                  {isPrivileged && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No support tickets logged.
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-indigo-600 font-bold">{t.ticketNumber}</span>
                        <div className="font-bold text-slate-900 mt-0.5">{t.subject}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{t.description}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{t.category}</td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.priority === 'HIGH' || t.priority === 'URGENT' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {t.employeeId?.firstName} {t.employeeId?.lastName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      {isPrivileged && (
                        <td className="py-3.5 px-4 text-right">
                          {t.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleResolveTicket(t._id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-md text-xs font-bold"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Goal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Target className="w-5 h-5 text-indigo-600 mr-2" />
              New Performance Goal / OKR
            </h3>
            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Goal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Build Microservices Gateway"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={goalForm.category}
                    onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="PROJECT">Project</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="LEADERSHIP">Leadership</option>
                    <option value="INNOVATION">Innovation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Weightage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={goalForm.weightage}
                    onChange={(e) => setGoalForm({ ...goalForm, weightage: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows="2"
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Asset */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Laptop className="w-5 h-5 text-indigo-600 mr-2" />
              Catalog Company Asset
            </h3>
            <form onSubmit={handleCreateAsset} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell XPS 15 9530"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="PHONE">Phone</option>
                    <option value="PERIPHERAL">Peripheral</option>
                    <option value="FURNITURE">Furniture</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Cost (INR)</label>
                  <input
                    type="number"
                    value={assetForm.cost}
                    onChange={(e) => setAssetForm({ ...assetForm, cost: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Serial Number</label>
                <input
                  type="text"
                  placeholder="SN-XXXX-YYYY"
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Claim Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Receipt className="w-5 h-5 text-emerald-600 mr-2" />
              Submit Reimbursement Claim
            </h3>
            <form onSubmit={handleCreateExpense} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel Cab Fare to Airport"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="TRAVEL">Travel</option>
                    <option value="FOOD">Food & Meals</option>
                    <option value="ACCOMMODATION">Accommodation</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="INTERNET">Internet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Remarks / Reason</label>
                <textarea
                  rows="2"
                  value={expenseForm.remarks}
                  onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Raise Ticket */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <LifeBuoy className="w-5 h-5 text-rose-600 mr-2" />
              Raise Support Ticket
            </h3>
            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VPN Access Issue on Remote Machine"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="IT_SUPPORT">IT Support</option>
                    <option value="HR_POLICY">HR Policy</option>
                    <option value="PAYROLL_ISSUE">Payroll Query</option>
                    <option value="FACILITY">Facility</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detailed description of the issue or request..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
