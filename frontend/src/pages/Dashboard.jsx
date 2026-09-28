import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Phone, 
  PhoneOff, 
  Calendar, 
  Trash2, 
  Check, 
  Activity, 
  Clock, 
  AlertCircle,
  PlusCircle,
  Users,
  ShieldCheck,
  Database,
  Timer,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { fetchCallReports, fetchCallLogs } from '../store/callSlice';
import { fetchContacts } from '../store/contactSlice';
import { fetchReminders, completeReminder, deleteReminder } from '../store/reminderSlice';
import MetricCard from '../components/MetricCard';
import Dialer from '../components/Dialer';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'];

export default function Dashboard({ adminMode = false, userManagement = false }) {
  const dispatch = useDispatch();
  const reports = useSelector((state) => state.calls.reports);
  const reminders = useSelector((state) => state.reminders.list);
  const callStatus = useSelector((state) => state.calls.callStatus);
  const logs = useSelector((state) => state.calls.logs);
  const contacts = useSelector((state) => state.contacts.list);
  const activeCall = useSelector((state) => state.calls.activeCall);
  const currentUser = useSelector((state) => state.auth.user);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [adminRequests, setAdminRequests] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [userManagementLoading, setUserManagementLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchCallReports());
    dispatch(fetchReminders());
    dispatch(fetchCallLogs());
    dispatch(fetchContacts());
    if (adminMode || userManagement) {
      setUserManagementLoading(true);
      Promise.all([
        api.get('/api/auth/admin-requests'),
        api.get('/api/auth/users')
      ]).then(([requestsResponse, usersResponse]) => {
        setAdminRequests(requestsResponse.data);
        setSystemUsers(usersResponse.data);
      }).catch(() => {
        setAdminRequests([]);
        setSystemUsers([]);
      }).finally(() => setUserManagementLoading(false));
    }
  }, [dispatch, adminMode, userManagement]);

  const refreshUserManagement = () => {
    setUserManagementLoading(true);
    Promise.all([api.get('/api/auth/admin-requests'), api.get('/api/auth/users')])
      .then(([requestsResponse, usersResponse]) => {
        setAdminRequests(requestsResponse.data);
        setSystemUsers(usersResponse.data);
      }).catch(() => {
        setAdminRequests([]);
        setSystemUsers([]);
      }).finally(() => setUserManagementLoading(false));
  };

  const resolveAdminRequest = async (id, action) => {
    await api.put(`/api/auth/admin-requests/${id}`, { action });
    refreshUserManagement();
  };

  const unlockUser = async (id) => {
    await api.put(`/api/auth/users/${id}/unlock`);
    refreshUserManagement();
  };

  const lockUser = async (id) => {
    await api.post('/api/auth/lock-inactive-user', { userId: id });
    refreshUserManagement();
  };

  const activeReminders = reminders.filter(r => r.status === 'PENDING' || r.status === 'OVERDUE');

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}m ${remainSecs}s`;
  };

  const handleCompleteReminder = (id) => {
    dispatch(completeReminder(id));
  };

  const handleDeleteReminder = (id) => {
    dispatch(deleteReminder(id));
  };

  const monthlyCalls = logs.filter((call) => {
    const date = new Date(call.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const totalActiveSeconds = logs.reduce((sum, call) => sum + (call.duration || 0), 0) + (activeCall?.duration || 0);
  const idleSeconds = Math.max(0, Math.floor((Date.now() - new Date().setHours(9, 0, 0, 0)) / 1000) - totalActiveSeconds);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const myTodayCalls = logs.filter(call => call.userId === currentUser?.id && new Date(call.createdAt) >= startOfToday);
  const myTodayCallSeconds = myTodayCalls.reduce((sum, call) => sum + (call.duration || 0), 0) + (activeCall?.duration || 0);
  const completedCalls = logs.filter(call => call.status === 'COMPLETED');
  const missingRecordings = completedCalls.filter(call => !call.recordingUrl);
  const overdueReminders = reminders.filter(reminder => reminder.status !== 'COMPLETED' && new Date(reminder.dueDate) < new Date());
  const incompleteContacts = contacts.filter(contact => !contact.email || !contact.company);
  const recordingCompliance = completedCalls.length ? Math.round(((completedCalls.length - missingRecordings.length) / completedCalls.length) * 100) : 100;
  const auditEvents = [
    ...logs.map(call => ({ id: `call-${call.id}`, type: 'CALL', label: `${call.direction} call`, contactName: call.contactName, contactPhone: call.contactPhone, status: call.status, timestamp: call.createdAt, recordingUrl: call.recordingUrl })),
    ...reminders.map(reminder => ({ id: `reminder-${reminder.id}`, type: 'REMINDER', label: reminder.status === 'COMPLETED' ? 'Reminder completed' : 'Reminder scheduled', contactName: reminder.contactName, contactPhone: reminder.contactPhone, status: reminder.status, timestamp: reminder.updatedAt || reminder.createdAt, recordingUrl: null }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const visibleAuditEvents = auditEvents.filter(event => {
    const query = auditSearch.toLowerCase();
    const matchesQuery = !query || event.contactName.toLowerCase().includes(query) || event.contactPhone.includes(query) || event.label.toLowerCase().includes(query);
    return matchesQuery && (auditFilter === 'ALL' || event.type === auditFilter);
  });
  const exportAuditCsv = () => {
    const header = 'Type,Activity,Contact,Phone,Status,Date,Recording\n';
    const rows = visibleAuditEvents.map(event => [event.type, event.label, event.contactName, event.contactPhone, event.status, new Date(event.timestamp).toLocaleString(), event.recordingUrl ? 'Saved' : 'Not applicable'].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const isOnline = (user) => user.accountStatus !== 'LOCKED' && user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() < 2 * 60 * 1000;
  const inactivityMinutes = (user) => user.lastCallAt ? Math.floor((Date.now() - new Date(user.lastCallAt).getTime()) / 60000) : 'No calls yet';
  const exportUserActivity = () => {
    const header = 'Username,Role,Status,Time Since Last Call,Last Call\n';
    const rows = systemUsers.map(user => [user.username, user.role, user.accountStatus === 'LOCKED' ? 'Locked' : isOnline(user) ? 'Online' : 'Offline', inactivityMinutes(user), user.lastCallAt ? new Date(user.lastCallAt).toLocaleString() : 'No call recorded'].map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([header + rows], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-management-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (userManagement) {
    const managedUsers = systemUsers.filter(user => user.role !== 'admin');
    const getDailyCalls = (userId) => logs.filter(call => call.userId === userId && new Date(call.createdAt) >= startOfToday);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard title="Total User Accounts" value={managedUsers.length} icon={Users} description="Normal user accounts managed by admin" trendColor="text-royal-500" />
          <MetricCard title="Users Online" value={managedUsers.filter(isOnline).length} icon={Activity} description="Seen in the last two minutes" trendColor="text-emerald-500" />
          <MetricCard title="Locked Accounts" value={managedUsers.filter(user => user.accountStatus === 'LOCKED').length} icon={Lock} description="Require administrator unlock" trendColor="text-red-500" />
        </div>
        <div className="glass-panel border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-200">Admin Permission Requests</h3><p className="text-xs text-slate-500 mt-1">Approve or reject users who selected Admin Account during sign-up.</p></div><span className="text-xs bg-royal-900 text-royal-200 px-2 py-1 rounded-full">{adminRequests.length} pending</span></div>
          <div className="mt-4 space-y-2">{adminRequests.length === 0 ? <p className="text-sm text-slate-500 py-3">No pending permission requests.</p> : adminRequests.map(request => <div key={request.id} className="p-3 bg-dark-900 border border-slate-800 rounded-xl flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-200">{request.username}</p><p className="text-[10px] text-slate-500">Requested {new Date(request.createdAt).toLocaleString()}</p></div><div className="flex gap-2"><button onClick={() => resolveAdminRequest(request.id, 'block')} className="px-3 py-1.5 text-xs rounded-lg bg-red-950 text-red-200">Block</button><button onClick={() => resolveAdminRequest(request.id, 'reject')} className="px-3 py-1.5 text-xs rounded-lg bg-amber-950/40 text-amber-300">Reject</button><button onClick={() => resolveAdminRequest(request.id, 'approve')} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-950/40 text-emerald-300">Approve Admin</button></div></div>)}</div>
        </div>
        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-200">User Activity & Presence</h3><p className="text-xs text-slate-500 mt-1">Daily call totals and time are calculated from call records for each user.</p></div><div className="flex gap-2"><button onClick={exportUserActivity} className="px-3 py-2 text-xs rounded-lg bg-dark-800 border border-slate-700 text-slate-300 hover:border-royal-500"><Download className="w-3.5 h-3.5 inline mr-1" />Export</button><button onClick={refreshUserManagement} disabled={userManagementLoading} className="px-3 py-2 text-xs rounded-lg bg-royal-900 text-royal-100 disabled:opacity-50">{userManagementLoading ? 'Loading...' : 'Refresh Users'}</button></div></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-dark-900/50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Time Since Last Call</th><th className="px-5 py-3">Last Call</th><th className="px-5 py-3">Calls Today</th><th className="px-5 py-3">Call Time Today</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-800">{managedUsers.map(user => { const calls = getDailyCalls(user.id); const seconds = calls.reduce((sum, call) => sum + (call.duration || 0), 0); return <tr key={user.id} className="text-slate-300"><td className="px-5 py-4 font-semibold">{user.username}</td><td className="px-5 py-4"><span className={`text-xs ${user.accountStatus === 'LOCKED' ? 'text-red-400' : isOnline(user) ? 'text-emerald-400' : 'text-slate-500'}`}>{user.accountStatus === 'LOCKED' ? 'Locked' : isOnline(user) ? 'Online' : 'Offline'}</span></td><td className="px-5 py-4 text-xs font-mono">{typeof inactivityMinutes(user) === 'number' ? `${inactivityMinutes(user)} min` : inactivityMinutes(user)}</td><td className="px-5 py-4 text-xs">{user.lastCallAt ? new Date(user.lastCallAt).toLocaleString() : 'No call recorded'}</td><td className="px-5 py-4">{calls.length}</td><td className="px-5 py-4">{formatDuration(seconds)}</td><td className="px-5 py-4 text-right flex justify-end gap-2">{user.accountStatus === 'LOCKED' ? <button onClick={() => unlockUser(user.id)} className="px-3 py-1.5 text-xs rounded-lg bg-royal-900 text-royal-100">Unlock</button> : <button onClick={() => lockUser(user.id)} className="px-3 py-1.5 text-xs rounded-lg bg-red-950/50 text-red-200">Lock</button>}</td></tr> })}{managedUsers.length === 0 && <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-500">{userManagementLoading ? 'Loading users...' : 'No normal user accounts found.'}</td></tr>}</tbody></table></div>
        </div>
      </div>
    );
  }

  if (currentUser?.role === 'user') {
    const lastMyCall = myTodayCalls[0];
    const myRecentCalls = logs.filter(call => call.userId === currentUser.id).slice(0, 5);
    const upcomingReminders = activeReminders.filter(reminder => new Date(reminder.dueDate) >= new Date()).slice(0, 4);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">My Account</p><p className="mt-2 text-xl font-bold text-white">{currentUser.username}</p><p className="mt-1 text-xs text-slate-500">User account · shared CRM access</p></div>
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">My Call Time Today</p><p className="mt-2 text-2xl font-bold text-emerald-400">{formatDuration(myTodayCallSeconds)}</p><p className="mt-1 text-xs text-slate-500">Talk time from your own calls only</p></div>
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">My Last Call</p><p className="mt-2 text-sm font-semibold text-slate-200">{lastMyCall ? lastMyCall.contactName : 'No call today'}</p><p className="mt-1 text-xs text-slate-500">{lastMyCall ? new Date(lastMyCall.createdAt).toLocaleString() : 'Make a call using the dialer'}</p></div>
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overdue Follow-ups</p><p className={`mt-2 text-2xl font-bold ${overdueReminders.length ? 'text-red-400' : 'text-emerald-400'}`}>{overdueReminders.length}</p><p className="mt-1 text-xs text-slate-500">Complete overdue reminders below</p></div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 h-[460px]"><Dialer /></div>
          <div className="xl:col-span-2 glass-panel border border-slate-800 rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-200">Overdue Follow-ups</h3><p className="text-xs text-slate-500 mt-1">Complete these items after you finish the required call.</p></div><AlertTriangle className="w-5 h-5 text-red-400" /></div><div className="mt-4 space-y-3 max-h-80 overflow-y-auto">{overdueReminders.length === 0 ? <div className="py-10 text-center text-sm text-emerald-400"><CheckCircle2 className="w-6 h-6 mx-auto mb-2" />No overdue follow-ups. Great work.</div> : overdueReminders.map(reminder => <div key={reminder.id} className="p-4 rounded-xl border border-red-900/50 bg-red-950/20 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-slate-200">{reminder.title}</p><p className="text-xs text-slate-400 mt-1">{reminder.contactName} · {reminder.contactPhone}</p><p className="text-[10px] text-red-300 mt-1">Due {new Date(reminder.dueDate).toLocaleString()}</p></div><button onClick={() => handleCompleteReminder(reminder.id)} className="shrink-0 px-3 py-2 rounded-lg bg-emerald-900/50 text-emerald-300 text-xs hover:bg-emerald-800">Mark Complete</button></div>)}</div></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-200">My Work Status</h3><p className="text-xs text-slate-500 mt-1">Your current calling availability.</p></div><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${callStatus === 'IDLE' ? 'bg-emerald-950/50 text-emerald-300' : 'bg-royal-950/60 text-royal-300'}`}>{callStatus === 'IDLE' ? 'Ready for calls' : callStatus === 'INCOMING' ? 'Incoming call' : 'On a call'}</span></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-dark-900 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Recording</p><p className="mt-1 text-sm font-semibold text-emerald-400">Mandatory & enabled</p></div><div className="rounded-xl bg-dark-900 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">Auto logout</p><p className="mt-1 text-sm font-semibold text-slate-200">45 min without a call</p></div></div><p className="mt-4 text-xs text-slate-500">Use the saved-contact search in the dialer to call a client or lead by name.</p></div>
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-200">Upcoming Follow-ups</h3><p className="text-xs text-slate-500 mt-1">Your next scheduled calling tasks.</p></div><Calendar className="w-5 h-5 text-royal-400" /></div><div className="mt-4 space-y-2 max-h-48 overflow-y-auto">{upcomingReminders.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No upcoming follow-ups are scheduled.</p> : upcomingReminders.map(reminder => <div key={reminder.id} className="rounded-xl bg-dark-900 border border-slate-800 p-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-200">{reminder.title}</p><p className="text-xs text-slate-500">{reminder.contactName} · {new Date(reminder.dueDate).toLocaleString()}</p></div><button onClick={() => handleCompleteReminder(reminder.id)} className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-300 text-xs hover:bg-emerald-800">Complete</button></div>)}</div></div>
        </div>
        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden"><div className="p-5 border-b border-slate-800"><h3 className="text-sm font-bold text-slate-200">My Recent Call Activity</h3><p className="text-xs text-slate-500 mt-1">Your latest saved call records.</p></div><div className="divide-y divide-slate-800">{myRecentCalls.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Your call activity will appear here after you complete a call.</p> : myRecentCalls.map(call => <div key={call.id} className="p-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-200">{call.contactName}</p><p className="text-xs text-slate-500">{call.direction} · {call.status} · {new Date(call.createdAt).toLocaleString()}</p></div><span className="text-xs text-slate-400">{formatDuration(call.duration || 0)}</span></div>)}</div></div>
      </div>
    );
  }

  if (adminMode) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <MetricCard title="Recording Compliance" value={`${recordingCompliance}%`} icon={ShieldCheck} description={`${missingRecordings.length} completed call(s) need review`} trendColor={missingRecordings.length ? 'text-red-500' : 'text-emerald-500'} />
          <MetricCard title="Overdue Follow-ups" value={overdueReminders.length} icon={AlertTriangle} description="Pending reminders past due time" trendColor={overdueReminders.length ? 'text-red-500' : 'text-emerald-500'} />
          <MetricCard title="Data Quality Checks" value={incompleteContacts.length} icon={Database} description="Contacts missing email or company" trendColor={incompleteContacts.length ? 'text-amber-500' : 'text-emerald-500'} />
          <MetricCard title="Recording Review" value={missingRecordings.length} icon={AlertTriangle} description="Completed calls missing saved audio" trendColor={missingRecordings.length ? 'text-red-500' : 'text-emerald-500'} />
          <MetricCard title="Active / Idle" value={callStatus === 'IDLE' ? 'Idle' : 'Active'} icon={Timer} description={`${Math.floor(totalActiveSeconds / 60)}m active · ${Math.floor(idleSeconds / 60)}m idle today`} trendColor="text-amber-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-200">Compliance Exceptions</h3><p className="text-xs text-slate-500 mt-1">Items requiring administrator review.</p></div><AlertTriangle className="w-5 h-5 text-amber-400" /></div><div className="mt-4 space-y-2 max-h-48 overflow-y-auto">{missingRecordings.length === 0 && overdueReminders.length === 0 ? <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="w-4 h-4" />No compliance exceptions found.</div> : <>{missingRecordings.map(call => <div key={call.id} className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-xs"><span className="text-red-300 font-bold">Missing recording</span><span className="text-slate-300"> — {call.contactName}</span></div>)}{overdueReminders.map(reminder => <div key={reminder.id} className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 flex items-center justify-between gap-3 text-xs"><span><span className="text-amber-300 font-bold">Overdue follow-up</span><span className="text-slate-300"> — {reminder.contactName}</span></span><button onClick={() => dispatch(completeReminder(reminder.id))} className="text-emerald-400 hover:text-emerald-300">Mark complete</button></div>)}</>}</div></div>
          <div className="glass-panel border border-slate-800 rounded-2xl p-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-bold text-slate-200">Shared Data Governance</h3><p className="text-xs text-slate-500 mt-1">Health of organization-wide CRM data.</p></div><Users className="w-5 h-5 text-royal-400" /></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div className="rounded-lg bg-dark-900 p-3"><p className="text-xl font-bold text-white">{contacts.length}</p><p className="text-[10px] text-slate-500">Shared contacts</p></div><div className="rounded-lg bg-dark-900 p-3"><p className="text-xl font-bold text-white">{monthlyCalls.length}</p><p className="text-[10px] text-slate-500">Calls this month</p></div><div className="rounded-lg bg-dark-900 p-3"><p className="text-xl font-bold text-white">{activeReminders.length}</p><p className="text-[10px] text-slate-500">Open reminders</p></div></div><p className="mt-4 text-xs text-slate-400">All records are shared across signed-in users. Use the data quality count above to complete incomplete contacts.</p></div>
        </div>
        <div className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h3 className="text-sm font-bold text-slate-200">Unified Activity Audit Trail</h3><p className="text-xs text-slate-500 mt-1">Calls and reminder actions, with searchable compliance evidence.</p></div><button onClick={exportAuditCsv} className="px-3 py-2 rounded-lg bg-dark-800 border border-slate-700 text-xs text-slate-300 hover:border-royal-500"><Download className="w-3.5 h-3.5 inline mr-1.5" />Export audit CSV</button></div><div className="mt-4 flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input value={auditSearch} onChange={event => setAuditSearch(event.target.value)} placeholder="Search contact, phone, or activity..." className="w-full pl-9 pr-3 py-2 bg-dark-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-royal-500" /></div><select value={auditFilter} onChange={event => setAuditFilter(event.target.value)} className="bg-dark-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300"><option value="ALL">All activity</option><option value="CALL">Calls only</option><option value="REMINDER">Reminders only</option></select></div></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-dark-900/50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3">Type</th><th className="px-6 py-3">Activity</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">When</th><th className="px-6 py-3">Evidence</th></tr></thead><tbody className="divide-y divide-slate-800">{visibleAuditEvents.slice(0, 50).map(event => <tr key={event.id} className="text-slate-300"><td className="px-6 py-4 text-xs text-royal-300">{event.type}</td><td className="px-6 py-4">{event.label}</td><td className="px-6 py-4">{event.contactName}<span className="block text-xs text-slate-500">{event.contactPhone}</span></td><td className="px-6 py-4">{event.status}</td><td className="px-6 py-4 text-xs">{new Date(event.timestamp).toLocaleString()}</td><td className="px-6 py-4">{event.type === 'CALL' ? event.recordingUrl ? <span className="text-emerald-400">Recording saved</span> : <span className="text-amber-400">Review recording</span> : <span className="text-slate-500">Reminder record</span>}</td></tr>)}{visibleAuditEvents.length === 0 && <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-500">No audit events match the current filters.</td></tr>}</tbody></table></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 4 Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Call Volume"
          value={reports.summary.totalCalls}
          icon={Activity}
          description="Total inbound & outbound calls logged"
          trendColor="text-royal-500"
        />
        <MetricCard
          title="Connected Calls"
          value={reports.summary.completedCalls}
          icon={Phone}
          description="Successful calling connections"
          trendColor="text-emerald-500"
        />
        <MetricCard
          title="Missed Calls"
          value={reports.summary.missedCalls}
          icon={PhoneOff}
          description="Unanswered inbound calling triggers"
          trendColor="text-red-500"
        />
        <MetricCard
          title="Average Duration"
          value={formatDuration(reports.summary.avgDuration)}
          icon={Clock}
          description="Avg length of completed calls"
          trendColor="text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel border border-slate-800 rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">My Calls Today</p><p className="mt-1 text-3xl font-bold text-royal-400">{myTodayCalls.length}</p><p className="mt-1 text-xs text-slate-500">Calls completed or attempted by {currentUser?.username || 'you'} today</p></div>
        <div className="glass-panel border border-slate-800 rounded-xl p-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">My Call Time Today</p><p className="mt-1 text-3xl font-bold text-emerald-400">{formatDuration(myTodayCallSeconds)}</p><p className="mt-1 text-xs text-slate-500">Total talk time from your calls today</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel border border-slate-800 rounded-xl p-4"><p className="text-xs text-slate-500">Monthly Calls Database</p><p className="text-2xl font-bold text-white mt-1">{monthlyCalls.length}</p><p className="text-[11px] text-slate-500 mt-1">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p></div>
        <div className="glass-panel border border-slate-800 rounded-xl p-4"><p className="text-xs text-slate-500">Active Time</p><p className="text-2xl font-bold text-emerald-400 mt-1">{Math.floor(totalActiveSeconds / 60)}m</p><p className="text-[11px] text-slate-500 mt-1">Accumulated recorded talk time</p></div>
        <div className="glass-panel border border-slate-800 rounded-xl p-4"><p className="text-xs text-slate-500">Idle Time Today</p><p className="text-2xl font-bold text-amber-400 mt-1">{Math.floor(idleSeconds / 60)}m</p><p className="text-[11px] text-slate-500 mt-1">Since 09:00, excluding active calls</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Charts Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly volume bar chart */}
          <div className="glass-panel border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-6">Call Volume Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.volumeTrend}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1f2937', borderRadius: '8px', color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status distribution pie */}
            <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Call Status Overview</h3>
              {reports.statusSegments.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">No calling records found</div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reports.statusSegments}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {reports.statusSegments.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs">
                    {reports.statusSegments.map((segment, idx) => (
                      <div key={segment.name} className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="text-slate-400">{segment.name}:</span>
                        <span className="font-bold text-slate-200">{segment.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inbound vs Outbound pie */}
            <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Call Direction Breakdown</h3>
              {reports.directionSegments.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-slate-500">No calling records found</div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="h-44 w-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reports.directionSegments}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {reports.directionSegments.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#10b981'} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs">
                    {reports.directionSegments.map((segment, idx) => (
                      <div key={segment.name} className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: idx === 0 ? '#3b82f6' : '#10b981' }}></span>
                        <span className="text-slate-400">{segment.name}:</span>
                        <span className="font-bold text-slate-200">{segment.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Dialer & Active Reminders */}
        <div className="space-y-6">
          {/* Active Dialer */}
          <div className="h-[460px]">
            <Dialer />
          </div>

          {/* Follow-up reminders panel */}
          <div className="glass-panel border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-royal-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Follow-up Reminders</h4>
              </div>
              <span className="text-[10px] bg-royal-900 border border-royal-700 text-royal-300 font-bold px-2 py-0.5 rounded-full">
                {activeReminders.length} Pending
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3 pr-1">
              {activeReminders.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center space-y-1.5">
                  <AlertCircle className="w-6 h-6 text-slate-600" />
                  <p className="text-xs text-slate-500">No scheduled reminders.</p>
                  <p className="text-[10px] text-slate-600">Schedule one from the Contacts tab.</p>
                </div>
              ) : (
                activeReminders.map((reminder) => {
                  const isOverdue = new Date(reminder.dueDate) < new Date();
                  return (
                    <div 
                      key={reminder.id} 
                      className={`p-3 bg-dark-900 border rounded-xl flex items-center justify-between transition-colors ${
                        isOverdue ? 'border-red-900/40 bg-red-950/5' : 'border-slate-800/80'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-semibold text-slate-250 truncate ${isOverdue ? 'text-red-400' : ''}`}>
                            {reminder.title}
                          </span>
                          {isOverdue && (
                            <span className="text-[8px] bg-red-600 text-white font-bold px-1 py-0.5 rounded">
                              Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Call {reminder.contactName} ({reminder.contactPhone})
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1">
                          Due: {new Date(reminder.dueDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="p-1.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                          title="Complete Task"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReminder(reminder.id)}
                          className="p-1.5 bg-red-600/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                          title="Delete Reminder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
