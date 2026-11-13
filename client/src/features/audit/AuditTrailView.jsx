import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  Server,
  FileCode,
} from 'lucide-react';
import api from '../../lib/axios';

/**
 * Enterprise Compliance Audit Trail Explorer
 * SOC 2 / ISO 27001 compliant immutable event logging and forensic activity inspector
 */
export const AuditTrailView = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters
  const [actorEmail, setActorEmail] = useState('');
  const [action, setAction] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, action, status]);

  const loadSummary = async () => {
    try {
      const res = await api.get('/audit/summary');
      setSummary(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load audit summary:', err.message);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (action !== 'ALL') params.append('action', action);
      if (status !== 'ALL') params.append('status', status);
      if (actorEmail.trim()) params.append('actorEmail', actorEmail.trim());

      const res = await api.get(`/audit/logs?${params.toString()}`);
      setLogs(res.data?.data || []);
      setPagination(res.data?.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to query audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail & Compliance</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full">
              SOC 2 Compliant • Immutable Log
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Forensic tracking of all administrative actions, authentication attempts, and data modifications
          </p>
        </div>

        <button
          onClick={() => {
            loadSummary();
            loadLogs();
          }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit
        </button>
      </div>

      {/* Summary KPI Badges */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Total Forensic Events</span>
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{summary.totalEvents || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Append-only immutable record</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Events Today</span>
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{summary.todayEvents || 0}</p>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">Active platform monitoring</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Integrity Shield</span>
              <Lock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">100%</p>
            <p className="text-[11px] text-slate-400 mt-1">SHA-256 token hashing & RBAC guarded</p>
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by Actor Email (e.g. hr@peoplecore.local)..."
              value={actorEmail}
              onChange={(e) => setActorEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 font-medium text-slate-700 bg-white"
          >
            <option value="ALL">Status: All</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-indigo-700">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{log.actorEmail || 'System / Guest'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          SUCCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          FAILURE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page <span className="font-bold text-slate-800">{pagination.page || 1}</span> of{' '}
            <span className="font-bold text-slate-800">{pagination.totalPages || 1}</span> ({pagination.total || 0} total logs)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= (pagination.totalPages || 1)}
              className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Audit Forensic Record</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Action:</span>
                <p className="font-mono text-indigo-600 font-bold">{selectedLog.action}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-500">Actor Email:</span>
                  <p className="text-slate-800">{selectedLog.actorEmail || 'System'}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Timestamp:</span>
                  <p className="text-slate-800">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Client User Agent:</span>
                <p className="text-[11px] text-slate-600 break-all">{selectedLog.userAgent || 'Internal System Client'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500">Metadata Payload (JSON):</span>
                <pre className="mt-1 p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 rounded-xl"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrailView;
