import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import { AddEmployeeModal } from './AddEmployeeModal';
import { EmployeeDetailModal } from './EmployeeDetailModal';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Building,
  ChevronRight,
} from 'lucide-react';

export const EmployeeDirectory = () => {
  const { user, hasRole } = useAuth();
  const isPrivileged =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('MANAGER') ||
    hasRole('EXECUTIVE') ||
    hasRole('PAYROLL_ADMIN');

  const canAdd = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN') || hasRole('HR_EXECUTIVE');

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedDept) params.append('departmentId', selectedDept);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/employees?${params.toString()}`);
      setEmployees(res.data.data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await api.get('/organization/departments');
        setDepartments(res.data.data);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    if (isPrivileged) {
      loadDepartments();
    }
  }, [isPrivileged]);

  useEffect(() => {
    if (!isPrivileged) return;
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedDept, selectedStatus, isPrivileged]);

  if (!isPrivileged) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Personnel Profile</h2>
          <p className="text-xs text-slate-500">
            Your verified employee identity, organizational assignment, and job details
          </p>
        </div>
        <EmployeeDetailModal employeeId="me" isInline={true} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Employee Directory
          </h2>
          <p className="text-xs text-slate-500">
            {isPrivileged
              ? 'Authoritative company personnel records and reporting hierarchy'
              : 'Your verified employee identity, organizational assignment, and job details'}
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add New Employee
          </button>
        )}
      </div>

      {/* Search & Filter Controls (Privileged users only) */}
      {isPrivileged && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name, code, or email..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="NOTICE_PERIOD">Notice Period</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-500'}`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Directory Grid / Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          Loading directory records...
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No employees found</p>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria or add an employee.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp._id}
              onClick={() => setSelectedEmpId(emp._id)}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100">
                      {emp.firstName?.[0]}
                      {emp.lastName?.[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {emp.firstName} {emp.lastName}
                      </h4>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {emp.employeeCode}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      emp.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mt-4">
                  <p className="font-medium text-slate-800 flex items-center">
                    <Building className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    {emp.designationId?.title || 'Team Member'} • {emp.departmentId?.name || 'General'}
                  </p>
                  <p className="flex items-center text-slate-500">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    {emp.locationId?.name || 'Headquarters'}
                  </p>
                  <p className="flex items-center text-slate-500">
                    <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    {emp.workEmail}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-medium">
                <span>View Full Profile</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-left">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Department & Role</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {employees.map((emp) => (
                <tr
                  key={emp._id}
                  onClick={() => setSelectedEmpId(emp._id)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {emp.firstName} {emp.lastName}
                    <span className="block font-normal text-[11px] text-slate-400">{emp.workEmail}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-600">{emp.employeeCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{emp.designationId?.title || '-'}</p>
                    <p className="text-[11px] text-slate-400">{emp.departmentId?.name || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{emp.locationId?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-indigo-600 font-semibold">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchEmployees}
      />

      {/* Employee Details & History Modal */}
      {selectedEmpId && (
        <EmployeeDetailModal
          employeeId={selectedEmpId}
          onClose={() => setSelectedEmpId(null)}
          onUpdated={fetchEmployees}
        />
      )}
    </div>
  );
};
