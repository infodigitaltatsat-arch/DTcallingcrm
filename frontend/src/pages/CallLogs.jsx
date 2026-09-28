import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  PhoneOff, 
  PhoneIncoming, 
  PhoneOutgoing, 
  FileText, 
  Edit3, 
  Check, 
  X,
  Volume2,
  Trash2
} from 'lucide-react';
import { fetchCallLogs, updateCallLogNotes, deleteCallLog } from '../store/callSlice';
import CallRecordingPlayer from '../components/CallRecordingPlayer';

export default function CallLogs() {
  const dispatch = useDispatch();
  const { logs, loading } = useSelector((state) => state.calls);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);
  
  // Note editing state
  const [editingLogId, setEditingLogId] = useState(null);
  const [editNotesText, setEditNotesText] = useState('');

  useEffect(() => {
    dispatch(fetchCallLogs());
  }, [dispatch]);

  const toggleExpandLog = (id) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
      setEditingLogId(null);
    } else {
      setExpandedLogId(id);
      setEditingLogId(null);
    }
  };

  const startEditNotes = (log, e) => {
    e.stopPropagation();
    setEditingLogId(log.id);
    setEditNotesText(log.notes || '');
  };

  const saveEditedNotes = async (id, e) => {
    e.stopPropagation();
    await dispatch(updateCallLogNotes({ id, notes: editNotesText }));
    setEditingLogId(null);
  };

  const cancelEditNotes = (e) => {
    e.stopPropagation();
    setEditingLogId(null);
  };

  const formatDuration = (secs) => {
    if (secs === 0) return '--';
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}m ${remainSecs}s`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px] font-bold">Connected</span>;
      case 'MISSED':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded text-[10px] font-bold">Missed</span>;
      case 'BUSY':
        return <span className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded text-[10px] font-bold">Busy</span>;
      default:
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/25 px-2 py-0.5 rounded text-[10px] font-bold">Failed</span>;
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.contactPhone.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesDirection = directionFilter === 'ALL' || log.direction === directionFilter;

    return matchesSearch && matchesStatus && matchesDirection;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by contact or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 text-sm"
          />
        </div>

        {/* Filters Select */}
        <div className="flex items-center space-x-4 w-full md:w-auto">
          {/* Status Dropdown */}
          <div className="flex-1 md:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-dark-900 border border-slate-800 text-slate-350 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-royal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Connected</option>
              <option value="MISSED">Missed</option>
              <option value="BUSY">Busy</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Direction Dropdown */}
          <div className="flex-1 md:flex-initial">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full bg-dark-900 border border-slate-800 text-slate-350 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-royal-500"
            >
              <option value="ALL">All Directions</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading call analytics...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No call logs found matching current search rules.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-dark-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Contact / Number</th>
                  <th className="px-6 py-4">Direction</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-center">Recordings</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isEditingNotes = editingLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      {/* Main Row */}
                      <tr 
                        onClick={() => toggleExpandLog(log.id)}
                        className={`hover:bg-dark-900/40 transition-colors cursor-pointer select-none ${
                          isExpanded ? 'bg-dark-900/20' : ''
                        }`}
                      >
                        {/* Name & Phone */}
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-slate-200">{log.contactName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{log.contactPhone}</p>
                          </div>
                        </td>

                        {/* Direction */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1.5 text-slate-350">
                            {log.direction === 'INBOUND' ? (
                              <>
                                <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Inbound</span>
                              </>
                            ) : (
                              <>
                                <PhoneOutgoing className="w-3.5 h-3.5 text-royal-400" />
                                <span>Outbound</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          {getStatusBadge(log.status)}
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4 font-mono text-slate-300">
                          {formatDuration(log.duration)}
                        </td>

                        {/* Created At */}
                        <td className="px-6 py-4 text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>

                        {/* Recording Icon Indicator */}
                        <td className="px-6 py-4 text-center">
                          {log.recordingUrl ? (
                            <div className="flex justify-center">
                              <span className="p-1 rounded bg-royal-950 border border-royal-700/30 text-royal-400">
                                <Volume2 className="w-4 h-4" />
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if(window.confirm('Are you sure you want to delete this call log?')) {
                                  dispatch(deleteCallLog(log.id));
                                }
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Call Log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="text-slate-500 hover:text-slate-300">
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable detail row */}
                      {isExpanded && (
                        <tr className="bg-dark-900/25 border-l-2 border-royal-600">
                          <td colSpan="7" className="px-8 py-5">
                            <div className="space-y-4">
                              {/* Audio Player if present */}
                              {log.recordingUrl ? (
                                <div className="space-y-1.5">
                                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Call Recording Recording</h5>
                                  <CallRecordingPlayer audioUrl={log.recordingUrl} />
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No audio clip was recorded during this call.</p>
                              )}

                              {/* Call Notes Area */}
                              <div className="bg-dark-900 border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2.5">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="w-4 h-4 text-royal-400" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Call Summary & Notes</span>
                                  </div>
                                  {!isEditingNotes && (
                                    <button 
                                      onClick={(e) => startEditNotes(log, e)}
                                      className="text-xs flex items-center space-x-1 text-slate-400 hover:text-royal-400 transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                </div>

                                {isEditingNotes ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editNotesText}
                                      onChange={(e) => setEditNotesText(e.target.value)}
                                      className="w-full bg-dark-950 border border-slate-850 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-royal-500"
                                      rows="3"
                                    />
                                    <div className="flex items-center space-x-2 justify-end">
                                      <button 
                                        onClick={cancelEditNotes}
                                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-dark-800 text-xs font-bold text-slate-400 border border-slate-800"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Cancel</span>
                                      </button>
                                      <button 
                                        onClick={(e) => saveEditedNotes(log.id, e)}
                                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-royal-700 hover:bg-royal-650 text-xs font-bold text-white shadow-glow-royal"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Save</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {log.notes || 'No call summary notes entered.'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
