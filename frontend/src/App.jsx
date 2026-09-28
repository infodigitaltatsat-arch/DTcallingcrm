import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import { Lock, X } from 'lucide-react';
import { Provider } from 'react-redux';
import { store } from './store';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CallLogs from './pages/CallLogs';
import Contacts from './pages/Contacts';
import Login from './pages/Login';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from './store/authSlice';
import { getErrorMessage } from './utils/errorMessage';

const TAB_PATHS = {
  dashboard: '/dashboard',
  logs: '/call-logs',
  contacts: '/contacts',
  admin: '/admin',
  users: '/users'
};

function getTabFromPath(pathname) {
  if (pathname === '/' || pathname === '/login') return 'dashboard';
  return Object.keys(TAB_PATHS).find(tab => TAB_PATHS[tab] === pathname) || 'dashboard';
}

function AppContent() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const currentUser = useSelector(state => state.auth.user);
  const [activeTab, setActiveTabState] = useState(() => getTabFromPath(window.location.pathname));
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminAuditAuthorized, setAdminAuditAuthorized] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [changingAdminPassword, setChangingAdminPassword] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const path = TAB_PATHS[tab] || TAB_PATHS.dashboard;
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  useEffect(() => {
    const handlePopState = () => setActiveTabState(getTabFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role === 'admin' || adminAuditAuthorized || activeTab !== 'admin') return;

    setActiveTabState('dashboard');
    window.history.replaceState(null, '', TAB_PATHS.dashboard);
    setAdminPassword('');
    setNewAdminPassword('');
    setAdminError('');
    setChangingAdminPassword(false);
    setShowAdminPrompt(true);
  }, [activeTab, adminAuditAuthorized, currentUser?.role, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) setAdminAuditAuthorized(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role === 'admin') return undefined;
    const timeout = setInterval(() => {
      const lastCallActivity = Number(localStorage.getItem('lastCallActivity') || Date.now());
      if (Date.now() - lastCallActivity >= 45 * 60 * 1000) {
        api.post('/api/auth/lock-inactive-user', { userId: currentUser?.id }).catch(() => null);
        dispatch(logout());
      }
    }, 60 * 1000);
    return () => clearInterval(timeout);
  }, [dispatch, isAuthenticated, currentUser?.role]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return undefined;
    const updatePresence = () => api.post('/api/auth/presence', { userId: currentUser.id }).catch(() => null);
    updatePresence();
    const heartbeat = setInterval(updatePresence, 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [isAuthenticated, currentUser?.id]);

  const requestAdminAccess = () => {
    if (currentUser?.role === 'admin' || adminAuditAuthorized) {
      setActiveTab('admin');
      return;
    }
    setAdminPassword('');
    setNewAdminPassword('');
    setAdminError('');
    setChangingAdminPassword(false);
    setShowAdminPrompt(true);
  };

  const verifyAdminAccess = async (event) => {
    event.preventDefault();
    setCheckingAdmin(true);
    setAdminError('');
    try {
      await api.post('/api/auth/verify-admin-audit', { password: adminPassword });
      setAdminAuditAuthorized(true);
      setActiveTab('admin');
      setShowAdminPrompt(false);
    } catch (error) {
      setAdminError(getErrorMessage(error, 'Unable to verify Admin Audit access'));
    } finally {
      setCheckingAdmin(false);
    }
  };

  const changeAdminPassword = async (event) => {
    event.preventDefault();
    setCheckingAdmin(true);
    setAdminError('');
    try {
      await api.post('/api/auth/change-admin-audit-password', { currentPassword: adminPassword, newPassword: newAdminPassword });
      setActiveTab('admin');
      setShowAdminPrompt(false);
    } catch (error) {
      setAdminError(getErrorMessage(error, 'Unable to change Admin Audit password'));
    } finally {
      setCheckingAdmin(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'logs':
        return <CallLogs />;
      case 'contacts':
        return <Contacts />;
      case 'admin':
        return <Dashboard adminMode />;
      case 'users':
        return <Dashboard userManagement />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onAdminAccess={requestAdminAccess}>
      {renderContent()}
      {showAdminPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={changingAdminPassword ? changeAdminPassword : verifyAdminAccess} className="w-full max-w-sm bg-dark-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
            <button type="button" onClick={() => setShowAdminPrompt(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="w-11 h-11 rounded-xl bg-royal-900/50 text-royal-400 flex items-center justify-center mb-4"><Lock className="w-5 h-5" /></div>
            <h3 className="text-lg font-bold text-white">{changingAdminPassword ? 'Change Admin Audit Password' : 'Admin Audit Access'}</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">{changingAdminPassword ? 'Use the current password and set a new private password.' : 'Enter the Admin Audit password to view organization-wide activity.'}</p>
            {adminError && <p className="mb-3 text-xs text-red-400">{adminError}</p>}
            <input autoFocus type="password" required value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder={changingAdminPassword ? 'Current password' : 'Admin Audit password'} className="w-full px-3.5 py-3 bg-dark-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500" />
            {changingAdminPassword && <input type="password" required minLength="8" value={newAdminPassword} onChange={(event) => setNewAdminPassword(event.target.value)} placeholder="New password (at least 8 characters)" className="w-full mt-3 px-3.5 py-3 bg-dark-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500" />}
            <button disabled={checkingAdmin} className="w-full mt-4 py-3 rounded-xl bg-royal-600 hover:bg-royal-500 disabled:opacity-60 text-white font-bold">{checkingAdmin ? 'Verifying...' : changingAdminPassword ? 'Change Password & Open Audit' : 'Open Admin Audit'}</button>
            <button type="button" onClick={() => { setChangingAdminPassword(!changingAdminPassword); setAdminError(''); setAdminPassword(''); setNewAdminPassword(''); }} className="w-full mt-3 text-xs text-royal-400 hover:text-royal-300">{changingAdminPassword ? 'Back to Admin Audit sign in' : 'Change Admin Audit password'}</button>
          </form>
        </div>
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
