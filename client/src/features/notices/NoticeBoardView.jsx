import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { useAuth } from '../auth/AuthContext';
import {
  Megaphone,
  Pin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  MessageSquare,
  FileText,
  User,
  Shield,
  X,
  Eye,
  BarChart2,
} from 'lucide-react';

export const NoticeBoardView = () => {
  const { user, hasRole } = useAuth();
  const canPost =
    hasRole('SUPER_ADMIN') ||
    hasRole('HR_ADMIN') ||
    hasRole('HR_EXECUTIVE') ||
    hasRole('EXECUTIVE') ||
    hasRole('MANAGER');
  const canViewReports = hasRole('SUPER_ADMIN') || hasRole('HR_ADMIN') || hasRole('AUDITOR');

  const [notices, setNotices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [ackReport, setAckReport] = useState(null);

  // New Notice Form
  const [newNotice, setNewNotice] = useState({
    title: '',
    bodyHtml: '',
    category: 'GENERAL',
    priority: 'NORMAL',
    audienceType: 'ALL',
    audienceTargetId: '',
    isPinned: false,
    requiresAck: false,
  });
  const [postLoading, setPostLoading] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notices');
      setNotices(res.data.data);
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMaster = async () => {
      try {
        const [dRes, lRes] = await Promise.all([
          api.get('/organization/departments'),
          api.get('/organization/locations'),
        ]);
        setDepartments(dRes.data.data);
        setLocations(lRes.data.data);
      } catch (err) {
        console.error('Failed to load org master:', err);
      }
    };
    loadMaster();
    fetchNotices();
  }, []);

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    setPostLoading(true);

    try {
      const payload = {
        title: newNotice.title,
        bodyHtml: `<p>${newNotice.bodyHtml.replace(/\n/g, '<br/>')}</p>`,
        category: newNotice.category,
        priority: newNotice.priority,
        isPinned: newNotice.isPinned,
        requiresAck: newNotice.requiresAck,
        audience: {
          type: newNotice.audienceType,
          targetIds: newNotice.audienceTargetId ? [newNotice.audienceTargetId] : [],
        },
      };

      await api.post('/notices', payload);
      setShowCreateModal(false);
      setNewNotice({
        title: '',
        bodyHtml: '',
        category: 'GENERAL',
        priority: 'NORMAL',
        audienceType: 'ALL',
        audienceTargetId: '',
        isPinned: false,
        requiresAck: false,
      });
      fetchNotices();
    } catch (err) {
      alert(err.message || 'Failed to post notice');
    } finally {
      setPostLoading(false);
    }
  };

  const handleOpenNotice = async (notice) => {
    try {
      const res = await api.get(`/notices/${notice._id}`);
      setSelectedNotice(res.data.data);
      // Fetch comments
      const commRes = await api.get(`/notices/${notice._id}/comments`);
      setComments(commRes.data.data);
    } catch (err) {
      console.error('Failed to load notice:', err);
    }
  };

  const handleAcknowledge = async (noticeId) => {
    try {
      await api.post(`/notices/${noticeId}/acknowledge`);
      if (selectedNotice) {
        setSelectedNotice({ ...selectedNotice, acknowledgedAt: new Date() });
      }
      fetchNotices();
    } catch (err) {
      alert(err.message || 'Failed to acknowledge notice');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedNotice) return;
    setCommentLoading(true);

    try {
      const res = await api.post(`/notices/${selectedNotice._id}/comments`, {
        text: newCommentText,
      });
      setComments([...comments, res.data.data]);
      setNewCommentText('');
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleViewReport = async (noticeId) => {
    try {
      const res = await api.get(`/notices/${noticeId}/receipts`);
      setAckReport(res.data.data);
      setShowReportModal(true);
    } catch (err) {
      alert(err.message || 'Failed to generate report');
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (selectedCategory === 'ALL') return true;
    return n.category === selectedCategory;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'IMPORTANT':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Post Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Official Company Notice Board</h2>
          <p className="text-xs text-slate-500">
            Targeted announcements, policy updates, and executive messages with acknowledgement tracking
          </p>
        </div>

        {canPost && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Post New Notice
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
        {[
          'ALL',
          'GENERAL',
          'POLICY',
          'HOLIDAY_CALENDAR',
          'LEADERSHIP',
          'URGENT',
          'EVENT',
          'IT_MAINTENANCE',
        ].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'All Notices' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Notices Feed */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
          Loading company notice board...
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No notices in this category</p>
          <p className="text-xs text-slate-500 mt-1">Check back later for company updates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => (
            <div
              key={notice._id}
              onClick={() => handleOpenNotice(notice)}
              className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer shadow-xs hover:border-indigo-300 ${
                notice.isPinned ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1.5">
                    {notice.isPinned && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        <Pin className="w-3 h-3 mr-1" /> Pinned
                      </span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(notice.priority)}`}>
                      {notice.priority}
                    </span>

                    <span className="text-[11px] font-mono font-medium text-slate-400">
                      {notice.category.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                    {notice.title}
                  </h3>

                  <div
                    className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: notice.bodyHtml }}
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center">
                      <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {notice.authorId?.firstName} {notice.authorId?.lastName}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {new Date(notice.publishAt).toLocaleDateString()}
                    </span>

                    {notice.requiresAck && (
                      <span
                        className={`inline-flex items-center font-semibold text-[11px] ${
                          notice.acknowledgedAt ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {notice.acknowledgedAt ? 'Acknowledged' : 'Acknowledgement Required'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <button className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-semibold transition-colors">
                    Read & Discussion
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notice Detail & Comments Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityBadge(selectedNotice.priority)}`}>
                    {selectedNotice.priority}
                  </span>
                  <span className="text-xs text-slate-400">{selectedNotice.category.replace('_', ' ')}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedNotice.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Published by {selectedNotice.authorId?.firstName} {selectedNotice.authorId?.lastName} on{' '}
                  {new Date(selectedNotice.publishAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedNotice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Body */}
              <div
                className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200"
                dangerouslySetInnerHTML={{ __html: selectedNotice.bodyHtml }}
              />

              {/* Acknowledgement Action Box */}
              {selectedNotice.requiresAck && (
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-indigo-900">Acknowledgement Required</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      {selectedNotice.acknowledgedAt
                        ? `Acknowledged on ${new Date(selectedNotice.acknowledgedAt).toLocaleString()}`
                        : 'Please confirm that you have read and understood this company notice.'}
                    </p>
                  </div>

                  {!selectedNotice.acknowledgedAt ? (
                    <button
                      onClick={() => handleAcknowledge(selectedNotice._id)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                    >
                      I Acknowledge
                    </button>
                  ) : (
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> Confirmed
                    </span>
                  )}
                </div>
              )}

              {/* Author / HR Acknowledgement Report Button */}
              {canViewReports && (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleViewReport(selectedNotice._id)}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                  >
                    <BarChart2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    View Acknowledgement Report (Audit)
                  </button>
                </div>
              )}

              {/* Comments Section */}
              {selectedNotice.commentsEnabled && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Discussion & Feedback ({comments.length})
                  </h4>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No comments yet. Start the conversation!</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c._id} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800">
                              {c.employeeId?.firstName} {c.employeeId?.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Write a respectful reply..."
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={commentLoading || !newCommentText.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post New Notice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Compose Notice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  placeholder="e.g. Annual Company Offsite 2026 Announcement"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newNotice.category}
                    onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="GENERAL">General</option>
                    <option value="POLICY">Policy</option>
                    <option value="HOLIDAY_CALENDAR">Holiday Calendar</option>
                    <option value="LEADERSHIP">Leadership Message</option>
                    <option value="EVENT">Event</option>
                    <option value="URGENT">Urgent</option>
                    <option value="IT_MAINTENANCE">IT Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newNotice.priority}
                    onChange={(e) => setNewNotice({ ...newNotice, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent Banner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audience Scope *</label>
                <select
                  value={newNotice.audienceType}
                  onChange={(e) => setNewNotice({ ...newNotice, audienceType: e.target.value, audienceTargetId: '' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ALL">Entire Organization (All Employees)</option>
                  <option value="DEPARTMENTS">Specific Department Only</option>
                  <option value="LOCATIONS">Specific Location / Office Only</option>
                </select>
              </div>

              {newNotice.audienceType === 'DEPARTMENTS' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Department</label>
                  <select
                    required
                    value={newNotice.audienceTargetId}
                    onChange={(e) => setNewNotice({ ...newNotice, audienceTargetId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">Choose department...</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {newNotice.audienceType === 'LOCATIONS' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Location</label>
                  <select
                    required
                    value={newNotice.audienceTargetId}
                    onChange={(e) => setNewNotice({ ...newNotice, audienceTargetId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="">Choose location...</option>
                    {locations.map((loc) => (
                      <option key={loc._id} value={loc._id}>{loc.name} ({loc.city})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notice Body Content *</label>
                <textarea
                  required
                  rows={4}
                  value={newNotice.bodyHtml}
                  onChange={(e) => setNewNotice({ ...newNotice, bodyHtml: e.target.value })}
                  placeholder="Enter notice text. Content is sanitized server-side against XSS."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newNotice.isPinned}
                    onChange={(e) => setNewNotice({ ...newNotice, isPinned: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Pin to top</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newNotice.requiresAck}
                    onChange={(e) => setNewNotice({ ...newNotice, requiresAck: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <span>Require Acknowledgement</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  {postLoading ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Acknowledgement Report Modal */}
      {showReportModal && ackReport && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Acknowledgement Report</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Reads</p>
                  <p className="text-xl font-bold text-slate-900">{ackReport.summary.totalReads}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <p className="text-[10px] text-emerald-600 uppercase font-semibold">Acknowledged</p>
                  <p className="text-xl font-bold text-emerald-700">{ackReport.summary.totalAcknowledged}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-slate-700 mb-2">Employee Acknowledgement Records:</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-left">Employee</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ackReport.receipts.map((r) => (
                        <tr key={r._id}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {r.employeeId?.firstName} {r.employeeId?.lastName}
                          </td>
                          <td className="px-3 py-2">
                            {r.acknowledgedAt ? (
                              <span className="text-emerald-600 font-semibold">Acknowledged</span>
                            ) : (
                              <span className="text-slate-400">Read only</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500">
                            {r.acknowledgedAt
                              ? new Date(r.acknowledgedAt).toLocaleString()
                              : new Date(r.firstReadAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
