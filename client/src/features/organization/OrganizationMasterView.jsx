import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import { Building, MapPin, Briefcase, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export const OrganizationMasterView = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN');

  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'designations' | 'locations'
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Department Form
  const [newDept, setNewDept] = useState({ name: '', code: '', description: '' });
  // New Designation Form
  const [newDesig, setNewDesig] = useState({ title: '', code: '', level: 'L1', departmentId: '' });
  // New Location Form
  const [newLoc, setNewLoc] = useState({ name: '', code: '', city: '', state: '', isHeadquarters: false });

  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [deptsRes, desigsRes, locsRes] = await Promise.all([
        api.get('/organization/departments'),
        api.get('/organization/designations'),
        api.get('/organization/locations'),
      ]);
      setDepartments(deptsRes.data.data);
      setDesignations(desigsRes.data.data);
      setLocations(locsRes.data.data);
    } catch (err) {
      console.error('Failed to load org master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post('/organization/departments', newDept);
      setNewDept({ name: '', code: '', description: '' });
      setActionSuccess('Department created successfully');
      loadAll();
    } catch (err) {
      setActionError(err.message || 'Failed to create department');
    }
  };

  const handleAddDesignation = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post('/organization/designations', newDesig);
      setNewDesig({ title: '', code: '', level: 'L1', departmentId: '' });
      setActionSuccess('Designation created successfully');
      loadAll();
    } catch (err) {
      setActionError(err.message || 'Failed to create designation');
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.post('/organization/locations', newLoc);
      setNewLoc({ name: '', code: '', city: '', state: '', isHeadquarters: false });
      setActionSuccess('Location created successfully');
      loadAll();
    } catch (err) {
      setActionError(err.message || 'Failed to create location');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization Master Data</h2>
        <p className="text-xs text-slate-500">
          Configure business departments, hierarchy titles, and branch locations
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="w-4 h-4 mr-1.5" />
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('designations')}
          className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'designations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase className="w-4 h-4 mr-1.5" />
          Designations ({designations.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'locations'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4 mr-1.5" />
          Locations ({locations.length})
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* List */}
          <div className="md:col-span-2 space-y-3">
            {departments.map((dept) => (
              <div key={dept._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{dept.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {dept.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{dept.description || 'No description provided'}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  {dept.status}
                </span>
              </div>
            ))}
          </div>

          {/* Add Form */}
          {canManage && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Plus className="w-4 h-4 mr-1 text-indigo-600" />
                Add Department
              </h3>
              <form onSubmit={handleAddDepartment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department Name *</label>
                  <input
                    type="text"
                    required
                    value={newDept.name}
                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                    placeholder="e.g. Operations"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={newDept.code}
                    onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                    placeholder="e.g. OPS"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={newDept.description}
                    onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Create Department
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'designations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {designations.map((des) => (
              <div key={des._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{des.title}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {des.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Level: <span className="font-semibold text-slate-700">{des.level}</span> • Dept:{' '}
                    <span className="font-semibold text-slate-700">{des.departmentId?.name || 'General'}</span>
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  {des.status}
                </span>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Plus className="w-4 h-4 mr-1 text-indigo-600" />
                Add Designation
              </h3>
              <form onSubmit={handleAddDesignation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={newDesig.title}
                    onChange={(e) => setNewDesig({ ...newDesig, title: e.target.value })}
                    placeholder="e.g. Product Manager"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={newDesig.code}
                    onChange={(e) => setNewDesig({ ...newDesig, code: e.target.value })}
                    placeholder="e.g. PM"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Level</label>
                  <input
                    type="text"
                    value={newDesig.level}
                    onChange={(e) => setNewDesig({ ...newDesig, level: e.target.value })}
                    placeholder="e.g. L2"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Department</label>
                  <select
                    value={newDesig.departmentId}
                    onChange={(e) => setNewDesig({ ...newDesig, departmentId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Create Designation
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {locations.map((loc) => (
              <div key={loc._id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{loc.name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {loc.code}
                    </span>
                    {loc.isHeadquarters && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded-md border border-purple-200">
                        Headquarters
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{loc.city}, {loc.state}, {loc.country}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  {loc.status}
                </span>
              </div>
            ))}
          </div>

          {canManage && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Plus className="w-4 h-4 mr-1 text-indigo-600" />
                Add Location
              </h3>
              <form onSubmit={handleAddLocation} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={newLoc.name}
                    onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                    placeholder="e.g. Hyderabad Hub"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={newLoc.code}
                    onChange={(e) => setNewLoc({ ...newLoc, code: e.target.value })}
                    placeholder="e.g. HYD-01"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={newLoc.city}
                      onChange={(e) => setNewLoc({ ...newLoc, city: e.target.value })}
                      placeholder="Hyderabad"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={newLoc.state}
                      onChange={(e) => setNewLoc({ ...newLoc, state: e.target.value })}
                      placeholder="Telangana"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
                >
                  Create Location
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
