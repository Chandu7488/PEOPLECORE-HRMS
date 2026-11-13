import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { UserPlus, X, AlertCircle, CheckCircle2, Mail, Copy, ExternalLink } from 'lucide-react';

export const AddEmployeeModal = ({ isOpen, onClose, onCreated }) => {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [managers, setManagers] = useState([]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    workEmail: '',
    phone: '',
    joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'FULL_TIME',
    departmentId: '',
    designationId: '',
    locationId: '',
    managerId: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadMasterData = async () => {
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
        setManagers(empsRes.data.data);
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
    };

    loadMasterData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = { ...formData };
      if (!payload.managerId) delete payload.managerId;
      if (!payload.departmentId) delete payload.departmentId;
      if (!payload.designationId) delete payload.designationId;
      if (!payload.locationId) delete payload.locationId;

      const res = await api.post('/employees', payload);
      setCreatedEmployee(res.data.data);
    } catch (err) {
      setError(err.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onCreated();
    onClose();
    setCreatedEmployee(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        {createdEmployee ? (
          <div className="text-center py-2 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Employee Created & Onboarded!</h3>
              <p className="text-xs text-slate-500 mt-1">
                User account has been auto-provisioned and a welcome email was sent.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Employee Name:</span>
                <span className="font-bold text-slate-900">{createdEmployee.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Employee Code:</span>
                <span className="font-mono font-bold text-indigo-600">{createdEmployee.employeeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Work Email:</span>
                <span className="text-slate-700 font-medium">{createdEmployee.workEmail}</span>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-left text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Welcome Email Dispatched via SMTP</span>
              </div>
              <p className="text-[11px] text-indigo-700">
                Delivered to <strong>{createdEmployee.workEmail}</strong>. You can view this live email in your open Mailpit tab at{' '}
                <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="underline font-bold">
                  http://localhost:8025
                </a>.
              </p>

              {createdEmployee.activationUrl && (
                <div className="pt-2 border-t border-indigo-200/60 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-600">Direct Account Activation Link:</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={createdEmployee.activationUrl}
                      className="w-full text-[10px] font-mono bg-white border border-indigo-300 rounded px-2.5 py-1.5 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdEmployee.activationUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shrink-0"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Done & View in Directory
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add New Employee</h3>
                  <p className="text-xs text-slate-500">Employee code will be auto-generated sequentially</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Aarav"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Sharma"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
              <input
                type="email"
                required
                value={formData.workEmail}
                onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="aarav@peoplecore.local"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date *</label>
              <input
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <select
                value={formData.designationId}
                onChange={(e) => setFormData({ ...formData, designationId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Designation</option>
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>{d.title} ({d.level})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Location</label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc._id} value={loc._id}>{loc.name} ({loc.city})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Manager</label>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Reporting Manager</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>{m.firstName} {m.lastName} ({m.employeeCode})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Employee Profile'}
            </button>
          </div>
        </form>
        </>
      )}
      </div>
    </div>
  );
};
