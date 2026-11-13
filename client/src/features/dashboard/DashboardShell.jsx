import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { EmployeeDirectory } from '../employees/EmployeeDirectory';
import { OrganizationMasterView } from '../organization/OrganizationMasterView';
import { CompanyCalendarView } from '../calendar/CompanyCalendarView';
import { NoticeBoardView } from '../notices/NoticeBoardView';
import { LeavePortalView } from '../leave/LeavePortalView';
import { AttendancePortalView } from '../attendance/AttendancePortalView';
import { PayrollPortalView } from '../payroll/PayrollPortalView';
import { RecruitmentPortalView } from '../recruitment/RecruitmentPortalView';
import { OffboardingPortalView } from '../offboarding/OffboardingPortalView';
import { CompanyOperationsPortalView } from '../operations/CompanyOperationsPortalView';
import { ReportsAnalyticsView } from '../reports/ReportsAnalyticsView';
import { AuditTrailView } from '../audit/AuditTrailView';
import api from '../../lib/axios';
import {
  Users,
  LogOut,
  Shield,
  Key,
  CheckCircle2,
  Calendar,
  Megaphone,
  Briefcase,
  Clock,
  Building,
  AlertCircle,
  LayoutDashboard,
  CreditCard,
  ChevronRight,
  Sparkles,
  UserPlus,
  UserMinus,
  Target,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';

export const DashboardShell = () => {
  const { user, permissions, logout, hasRole } = useAuth();
  const [currentNav, setCurrentNav] = useState('overview');

  // Change password modal state
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeMsg, setChangeMsg] = useState(null);
  const [changeErr, setChangeErr] = useState(null);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangeLoading(true);
    setChangeMsg(null);
    setChangeErr(null);

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setChangeMsg(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setChangeErr(err.message || 'Failed to update password');
    } finally {
      setChangeLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HR_ADMIN':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'EXECUTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'PAYROLL_ADMIN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const isPrivileged =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('MANAGER') ||
    hasRole('EXECUTIVE') ||
    hasRole('PAYROLL_ADMIN');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'notices', label: 'Notice Board', icon: Megaphone },
    { id: 'calendar', label: 'Company Calendar', icon: Calendar },
    { id: 'leave', label: 'Leave Management', icon: Briefcase },
    { id: 'attendance', label: 'Attendance & Shifts', icon: Clock },
    { id: 'payroll', label: 'Payroll Engine', icon: CreditCard },
    ...(isPrivileged || hasRole('RECRUITER')
      ? [{ id: 'recruitment', label: 'Recruitment & ATS', icon: UserPlus }]
      : []),
    { id: 'offboarding', label: isPrivileged ? 'Offboarding & Exit' : 'My Resignation', icon: UserMinus },
    { id: 'operations', label: 'Operations & Services', icon: Target },
    ...(isPrivileged || hasRole('AUDITOR')
      ? [
          { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
          { id: 'audit', label: 'Compliance & Audit', icon: ShieldAlert },
        ]
      : []),
    { id: 'directory', label: isPrivileged ? 'Employee Directory' : 'My Profile', icon: Users },
    ...(isPrivileged ? [{ id: 'organization', label: 'Organization Master', icon: Building }] : []),
  ];

  const getActiveTitle = () => {
    const item = navItems.find((n) => n.id === currentNav);
    return item ? item.label : 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen sticky top-0 z-30 shadow-xs">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center space-x-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-xs shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none truncate">
              PeopleCore
            </h1>
            <p className="text-[10px] text-slate-500 font-medium mt-1 truncate">
              HRMS Enterprise Platform
            </p>
          </div>
        </div>

        {/* Organization Pill */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization</p>
          <p className="text-xs font-semibold text-slate-800 truncate">PeopleCore Technologies Ltd.</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Card & Actions at Bottom */}
        <div className="p-3 border-t border-slate-200 bg-white space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <div className="flex items-center space-x-1 shrink-0">
                {user?.roles?.map((r) => (
                  <span
                    key={r}
                    className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full border ${getRoleBadgeColor(r)}`}
                  >
                    {r.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowChangeModal(true)}
              className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 text-xs font-medium transition-colors"
              title="Change Password"
            >
              <Key className="w-3.5 h-3.5 mr-1" />
              Password
            </button>
            <button
              onClick={logout}
              className="flex-1 inline-flex items-center justify-center px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 text-xs font-medium transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 mr-1 text-slate-400 hover:text-red-600" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Context Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-bold text-slate-900">{getActiveTitle()}</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-indigo-50/70 border border-indigo-200 px-2.5 py-1 rounded-lg text-indigo-700 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5" />
              <span>{permissions?.length || 0} Permissions</span>
            </div>
          </div>
        </header>

        {/* Main Workspaces View */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentNav === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        Enterprise Modules Operational
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 font-mono">Org: {user?.organizationName || 'PeopleCore Technologies Ltd.'}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mt-2">
                      Welcome back, {user?.firstName}!
                    </h2>
                    <p className="text-slate-600 text-sm mt-1 max-w-2xl">
                      Access official notices, manage holiday calendars, configure dynamic leave quotas, record attendance, review work shifts, and process monthly payroll.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <Shield className="w-7 h-7 text-indigo-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Effective Permissions</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {permissions?.length || 0} privileges assigned
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div
                  onClick={() => setCurrentNav('leave')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Leave Management</h3>
                  <p className="text-xs text-slate-500 mt-1">Dynamic quotas, holiday deductions & manager approvals</p>
                </div>

                <div
                  onClick={() => setCurrentNav('attendance')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance & Shifts</h3>
                  <p className="text-xs text-slate-500 mt-1">Web clocking, 5-day / 6-day work shifts & hybrid modes</p>
                </div>

                <div
                  onClick={() => setCurrentNav('payroll')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Payroll Engine</h3>
                  <p className="text-xs text-slate-500 mt-1">Salary cycles, attendance proration & corporate payslips</p>
                </div>

                <div
                  onClick={() => setCurrentNav('calendar')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg w-fit mb-3">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Company Calendar</h3>
                  <p className="text-xs text-slate-500 mt-1">Multi-year dropdown view & published holidays</p>
                </div>

                <div
                  onClick={() => setCurrentNav('notices')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg w-fit mb-3">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Notice Board</h3>
                  <p className="text-xs text-slate-500 mt-1">Official targeted notices & policy acknowledgements</p>
                </div>

                <div
                  onClick={() => setCurrentNav('directory')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-lg w-fit mb-3">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isPrivileged ? 'Employee Directory' : 'My Personnel Profile'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Personnel profiles & chronological job history</p>
                </div>

                {(isPrivileged || hasRole('RECRUITER')) && (
                  <div
                    onClick={() => setCurrentNav('recruitment')}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                  >
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Recruitment & ATS</h3>
                    <p className="text-xs text-slate-500 mt-1">Job requisitions, candidate pipeline & 1-click onboarding</p>
                  </div>
                )}

                <div
                  onClick={() => setCurrentNav('offboarding')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg w-fit mb-3">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isPrivileged ? 'Offboarding & Exit' : 'My Resignation'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Department clearance checklists & F&F exit settlement</p>
                </div>

                <div
                  onClick={() => setCurrentNav('operations')}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                >
                  <div className="p-2.5 bg-violet-50 text-violet-600 rounded-lg w-fit mb-3">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Operations & Services</h3>
                  <p className="text-xs text-slate-500 mt-1">Goals & OKRs, IT hardware assets, expense claims & helpdesk</p>
                </div>

                {(isPrivileged || hasRole('AUDITOR')) && (
                  <>
                    <div
                      onClick={() => setCurrentNav('reports')}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                    >
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Reports & Analytics</h3>
                      <p className="text-xs text-slate-500 mt-1">Workforce census, leave quotas & payroll register CSV exports</p>
                    </div>

                    <div
                      onClick={() => setCurrentNav('audit')}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 cursor-pointer transition-all"
                    >
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-3">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Compliance & Audit</h3>
                      <p className="text-xs text-slate-500 mt-1">SOC 2 forensic trail, security activity & metadata inspector</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentNav === 'notices' && <NoticeBoardView />}
          {currentNav === 'calendar' && <CompanyCalendarView />}
          {currentNav === 'leave' && <LeavePortalView />}
          {currentNav === 'attendance' && <AttendancePortalView />}
          {currentNav === 'payroll' && <PayrollPortalView />}
          {currentNav === 'recruitment' && <RecruitmentPortalView />}
          {currentNav === 'offboarding' && <OffboardingPortalView />}
          {currentNav === 'operations' && <CompanyOperationsPortalView />}
          {currentNav === 'reports' && <ReportsAnalyticsView />}
          {currentNav === 'audit' && <AuditTrailView />}
          {currentNav === 'directory' && <EmployeeDirectory />}
          {currentNav === 'organization' && <OrganizationMasterView />}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
          PeopleCore HRMS • Enterprise Workforce Management Platform
        </footer>
      </div>

      {/* Change Password Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Key className="w-5 h-5 text-indigo-600 mr-2" />
                Change Password
              </h3>
              <button
                onClick={() => setShowChangeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {changeMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{changeMsg}</span>
              </div>
            )}

            {changeErr && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{changeErr}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="At least 8 chars with upper, lower, number, special"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={changeLoading}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-60"
                >
                  {changeLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
