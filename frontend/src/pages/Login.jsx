import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone, Lock, User, ArrowRight, UserPlus, Eye, EyeOff } from 'lucide-react';
import { login, signup, clearError } from '../store/authSlice';

export default function Login() {
  const dispatch = useDispatch();
  const { error, loading } = useSelector((state) => state.auth);
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoginMode) {
      dispatch(login({ username, password }));
    } else {
      dispatch(signup({ username, password, requestedRole }));
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    dispatch(clearError());
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setRequestedRole('user');
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-gradient-to-tr from-royal-800 to-royal-500 rounded-xl shadow-glow-royal-lg animate-pulse-slow">
            <Phone className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          VoiceFlow CRM
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          {isLoginMode ? 'Sign in to access your dashboard' : 'Create a new account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel border border-slate-800 rounded-2xl py-8 px-4 shadow-2xl sm:px-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-royal-800/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <form className="space-y-6 relative z-10" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400 text-center font-medium">{error}</p>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if(error) dispatch(clearError());
                  }}
                  className="block w-full pl-10 pr-3 py-3 bg-dark-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 transition-colors"
                  placeholder="Enter username"
                />
              </div>
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Type</label>
                <select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)} className="block w-full px-3 py-3 bg-dark-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-royal-500">
                  <option value="user">User Account</option>
                  <option value="admin">Admin Account — approval required</option>
                </select>
                {requestedRole === 'admin' && <p className="mt-2 text-xs text-amber-300">Your request will be sent to an existing administrator. You can sign in only after approval.</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if(error) dispatch(clearError());
                  }}
                  className="block w-full pl-10 pr-11 py-3 bg-dark-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-royal-500 focus:ring-1 focus:ring-royal-500 transition-colors"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 text-slate-500 hover:text-slate-300" title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-glow-royal text-sm font-bold text-white bg-gradient-to-r from-royal-700 to-royal-500 hover:from-royal-600 hover:to-royal-400 focus:outline-none transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Processing...' : isLoginMode ? 'Sign In' : 'Create Account'}</span>
                {!loading && (isLoginMode ? <ArrowRight className="ml-2 w-4 h-4" /> : <UserPlus className="ml-2 w-4 h-4" />)}
              </button>
            </div>
          </form>
          {isLoginMode && (
            <div className="mt-5 rounded-xl border border-royal-800/50 bg-royal-950/30 p-3 text-xs text-slate-300 relative z-10">
              <p className="font-bold text-royal-300">Demo login IDs</p>
              <p className="mt-1">Admin: <span className="font-mono text-white">admin</span> / <span className="font-mono text-white">Admin@2026!</span></p>
              <p className="mt-1">User: <span className="font-mono text-white">user1</span> / <span className="font-mono text-white">User@2026!</span></p>
              <p className="mt-2 text-slate-500">Users are automatically signed out after 45 minutes without a completed call.</p>
            </div>
          )}
          
          <div className="mt-6 text-center text-sm text-slate-400 relative z-10">
            {isLoginMode ? (
              <p>
                Don't have an account?{' '}
                <button onClick={toggleMode} className="text-royal-400 hover:text-royal-300 font-semibold underline-offset-4 hover:underline transition-all">
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button onClick={toggleMode} className="text-royal-400 hover:text-royal-300 font-semibold underline-offset-4 hover:underline transition-all">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
