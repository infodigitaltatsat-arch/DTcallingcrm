import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { API_BASE_URL, api } from '../services/api';
import { 
  Phone, 
  PhoneOff, 
  BarChart2, 
  Clock, 
  Users, 
  Bell, 
  Settings, 
  Volume2, 
  VolumeX, 
  Check, 
  X,
  PhoneCall,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Maximize2,
  Minimize2,
  FileText,
  User,
  LogOut
} from 'lucide-react';
import { 
  addCallLogLocally, 
  updateCallLogLocally, 
  updateReportsLocally,
  receiveInboundCall,
  answerCall,
  connectCall,
  declineInboundCall,
  incrementCallDuration,
  toggleMute,
  toggleHold,
  startOutboundCall,
  updateLiveNotes,
  endActiveCall
} from '../store/callSlice';
import { 
  addAlert, 
  dismissAlert, 
  addReminderLocally, 
  updateReminderLocally,
  completeReminder
} from '../store/reminderSlice';
import { logout, markCallActivity } from '../store/authSlice';

export let socketInstance = null;

export default function Layout({ children, activeTab, setActiveTab, onAdminAccess }) {
  const dispatch = useDispatch();
  const activeCall = useSelector((state) => state.calls.activeCall);
  const callStatus = useSelector((state) => state.calls.callStatus);
  const activeAlerts = useSelector((state) => state.reminders.activeAlerts);
  const currentUser = useSelector((state) => state.auth.user);
  
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [isCallWidgetMinimized, setIsCallWidgetMinimized] = useState(false);

  // MediaRecorder refs for recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingActiveRef = useRef(false);

  // Connect sockets
  useEffect(() => {
    if (!API_BASE_URL) {
      console.error('VITE_API_URL must point to the deployed backend service.');
      return undefined;
    }

    const socket = io(API_BASE_URL, {
      auth: { token: localStorage.getItem('token') }
    });
    socketInstance = socket;

    socket.on('connect', () => {
      console.log('Connected to websocket server');
    });

    socket.on('inbound_call', (data) => {
      if (callStatus === 'IDLE') {
        dispatch(receiveInboundCall(data));
      }
    });

    socket.on('new_call_log', (data) => {
      dispatch(addCallLogLocally(data));
    });

    socket.on('call_log_updated', (data) => {
      dispatch(updateCallLogLocally(data));
    });

    socket.on('stats_update', (data) => {
      dispatch(updateReportsLocally(data));
    });

    socket.on('reminder_created', (data) => {
      dispatch(addReminderLocally(data));
    });

    socket.on('reminder_updated', (data) => {
      dispatch(updateReminderLocally(data));
    });

    socket.on('reminder_alert', (data) => {
      dispatch(addAlert(data));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, callStatus]);

  // Handle auto-connect outgoing calls
  useEffect(() => {
    if (callStatus === 'RINGING') {
      const timer = setTimeout(() => {
        dispatch(connectCall()); // connect outbound call after ring
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [callStatus, dispatch]);

  // Handle auto-miss inbound calls after 30 seconds
  useEffect(() => {
    if (callStatus === 'INCOMING' && activeCall) {
      const timer = setTimeout(() => {
        const payload = {
          contactId: activeCall.contactId,
          contactName: activeCall.contactName,
          contactPhone: activeCall.contactPhone,
          direction: activeCall.direction,
          status: 'MISSED',
          duration: 0,
          notes: ''
        };
        api.post('/api/calls', payload).catch(err => console.error('Error saving missed call log:', err));
        dispatch(declineInboundCall());
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [callStatus, activeCall, dispatch]);

  // Duration Timer
  useEffect(() => {
    let timer = null;
    if ((callStatus === 'CONNECTED' || callStatus === 'RINGING') && activeCall && !activeCall.isHeld) {
      timer = setInterval(() => {
        dispatch(incrementCallDuration());
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [dispatch, callStatus, activeCall?.isHeld]);

  // MediaRecorder triggers based on callState recording flag
  useEffect(() => {
    const triggerRecord = async () => {
      if (activeCall?.isRecording && !recordingActiveRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunksRef.current = [];
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.start();
          recordingActiveRef.current = true;
        } catch (err) {
          console.warn('Microphone access denied or unsupported.', err);
          recordingActiveRef.current = true; // Set true to bypass repeatedly prompting
        }
      } else if (!activeCall?.isRecording && recordingActiveRef.current) {
        stopRecordingTracks();
      }
    };

    triggerRecord();
  }, [activeCall?.isRecording]);

  const stopRecordingTracks = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    recordingActiveRef.current = false;
  };

  const getRecordingBlob = () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
          }
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  };

  const handleAnswer = () => {
    dispatch(answerCall());
  };

  const handleDecline = async () => {
    if (activeCall) {
      const payload = {
        contactId: activeCall.contactId,
        contactName: activeCall.contactName,
        contactPhone: activeCall.contactPhone,
        direction: activeCall.direction,
        status: 'MISSED',
        duration: 0,
        notes: ''
      };

      try {
        await api.post('/api/calls', payload);
      } catch (err) {
        console.error('Error saving missed call log:', err);
      }
    }

    dispatch(declineInboundCall());
  };

  const handleEndCall = async () => {
    if (!activeCall) return;

    let finalBlob = null;
    if (activeCall.isRecording) {
      finalBlob = await getRecordingBlob();
      if (!finalBlob) {
        const dummyContent = new Uint8Array(1000);
        finalBlob = new Blob([dummyContent], { type: 'audio/wav' });
      }
    }
    recordingActiveRef.current = false;

    const payload = {
      contactId: activeCall.contactId,
      contactName: activeCall.contactName,
      contactPhone: activeCall.contactPhone,
      direction: activeCall.direction,
      status: activeCall.duration > 0 ? 'COMPLETED' : 'MISSED',
      duration: activeCall.duration,
      notes: activeCall.notes
      ,userId: currentUser?.id || null
      ,userName: currentUser?.username || null
    };

    try {
      const response = await api.post('/api/calls', payload);
      const newLog = response.data;
      dispatch(markCallActivity());

      if (finalBlob) {
        const formData = new FormData();
        formData.append('audio', finalBlob, `call-recording-${newLog.id}.wav`);
        await api.post(`/api/calls/${newLog.id}/recording`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    } catch (err) {
      console.error('Error saving call log:', err);
    } finally {
      dispatch(endActiveCall());
      setIsCallWidgetMinimized(false);
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainSecs.toString().padStart(2, '0')}`;
  };

  const handleDismissReminder = (id) => {
    dispatch(dismissAlert(id));
  };

  const handleCompleteReminder = (id) => {
    dispatch(completeReminder(id));
    dispatch(dismissAlert(id));
  };

  // A due reminder becomes an automatically connected outbound call whenever
  // the agent is available. The existing ringing flow connects it after 1.5s.
  useEffect(() => {
    const dueReminder = activeAlerts[0];
    if (dueReminder && callStatus === 'IDLE') {
      dispatch(startOutboundCall({
        id: dueReminder.contactId,
        name: dueReminder.contactName,
        phone: dueReminder.contactPhone
      }));
      dispatch(dismissAlert(dueReminder.id));
    }
  }, [activeAlerts, callStatus, dispatch]);

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart2 },
    { id: 'logs', name: 'Call Logs', icon: Clock },
    { id: 'contacts', name: 'Master Data', icon: Users },
    { id: 'admin', name: 'Compliance Center', icon: Settings },
    { id: 'users', name: 'User Management', icon: Users }
  ];

  const inCall = callStatus === 'RINGING' || callStatus === 'CONNECTED';

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-900 border-r border-slate-800 flex flex-col justify-between z-10">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-royal-900/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-tr from-royal-800 to-royal-500 rounded-lg shadow-glow-royal">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                VoiceFlow CRM
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {navItems.filter((item) => !['admin', 'users'].includes(item.id) || currentUser?.role === 'admin').map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => item.id === 'admin' ? onAdminAccess() : setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-royal-900 text-white border-l-4 border-royal-500 shadow-glow-royal'
                      : 'text-slate-400 hover:bg-dark-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-royal-400' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-dark-950/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-royal-800 flex items-center justify-center font-bold text-sm text-white">
                {(currentUser?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">{currentUser?.username || 'User'}</p>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 active-call-pulse"></span>
                  <span className="text-[10px] text-slate-400">{currentUser?.role === 'admin' ? 'Administrator' : 'User'} - Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button 
                className="p-2 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-dark-800 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button 
                onClick={() => dispatch(logout())}
                className="p-2 text-red-500 hover:text-red-400 rounded-lg hover:bg-dark-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-dark-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-8 z-10">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold text-slate-100 capitalize">
              {activeTab === 'logs' ? 'Monthly Calls Database' : activeTab === 'admin' ? 'Compliance Center' : activeTab === 'users' ? 'User Management & Permissions' : activeTab === 'contacts' ? 'Master Data Management' : `${activeTab} Overview`}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 hidden sm:inline-block">
              Simulate Inbound calls from Contacts tab
            </span>

            <div className="relative">
              <button 
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                {activeAlerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-royal-500 rounded-full ring-2 ring-dark-900 active-call-pulse"></span>
                )}
              </button>

              {showNotificationCenter && (
                <div className="absolute right-0 mt-2 w-80 glass-panel border border-slate-800 rounded-xl shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-300">Due Reminders ({activeAlerts.length})</span>
                    <button onClick={() => setShowNotificationCenter(false)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-2">
                    {activeAlerts.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No active alerts</p>
                    ) : (
                      activeAlerts.map(alert => (
                        <div key={alert.id} className="p-2.5 bg-dark-800 rounded-lg border border-slate-700 flex flex-col justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-100">{alert.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{alert.contactName} ({alert.contactPhone})</p>
                            {alert.description && <p className="text-[10px] text-slate-500 mt-1">{alert.description}</p>}
                          </div>
                          <div className="flex justify-end space-x-2 mt-2 pt-2 border-t border-slate-700/50">
                            <button 
                              onClick={() => handleDismissReminder(alert.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-700/50 hover:bg-slate-700 rounded transition-colors"
                            >
                              Snooze
                            </button>
                            <button 
                              onClick={() => handleCompleteReminder(alert.id)}
                              className="text-[10px] text-white hover:bg-royal-500 px-2 py-1 bg-royal-700 rounded transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-dark-950 relative">
          {children}

          {/* Incoming Call Overlay */}
          {callStatus === 'INCOMING' && activeCall && (
            <div className="fixed bottom-6 right-6 w-96 bg-gradient-to-b from-dark-900 to-royal-950/80 border border-royal-700/50 shadow-glow-royal-lg rounded-2xl p-6 z-50 backdrop-blur-md active-call-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-full bg-royal-900 border border-royal-500 flex items-center justify-center animate-bounce">
                  <PhoneCall className="w-6 h-6 text-royal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-royal-400">Incoming CRM Call</span>
                  <h4 className="text-base font-bold text-white truncate">{activeCall.contactName}</h4>
                  <p className="text-xs text-slate-400 truncate">{activeCall.contactPhone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={handleDecline}
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500 text-red-200 hover:text-white transition-all duration-200 text-sm font-semibold active:scale-95"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={handleAnswer}
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg hover:shadow-emerald-500/20 transition-all duration-200 text-sm active:scale-95"
                >
                  <Phone className="w-4 h-4" />
                  <span>Answer</span>
                </button>
              </div>
            </div>
          )}

          {/* PERSISTENT GLOBAL ACTIVE CALL WIDGET (Bottom Right) */}
          {inCall && activeCall && (
            isCallWidgetMinimized ? (
              // Minimized calling pill
              <div className="fixed bottom-6 right-6 bg-gradient-to-r from-royal-950 to-dark-900 border border-royal-700/50 shadow-glow-royal-lg rounded-full px-5 py-3 flex items-center space-x-4 z-50 backdrop-blur active-call-pulse">
                <div className="flex items-center space-x-2.5">
                  <Phone className="w-4 h-4 text-royal-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-200">
                    Call: {activeCall.contactName} ({formatTime(activeCall.duration)})
                  </span>
                </div>
                <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
                  <button 
                    onClick={() => setIsCallWidgetMinimized(false)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    title="Expand Call Control"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={handleEndCall}
                    className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-full transition-colors"
                    title="End Call"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              // Expanded rich calling widget
              <div className="fixed bottom-6 right-6 w-96 bg-gradient-to-b from-dark-900 to-royal-950/90 border border-royal-750 shadow-glow-royal-lg rounded-2xl p-5 z-50 backdrop-blur-md">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 active-call-pulse"></span>
                    <span className="text-xs font-bold text-slate-350 tracking-wide uppercase">
                      {callStatus === 'RINGING' ? 'Ringing...' : activeCall.isHeld ? 'Call On Hold' : 'Call Connected'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={() => setIsCallWidgetMinimized(true)}
                      className="p-1.5 text-slate-500 hover:text-slate-300 rounded hover:bg-dark-800 transition-colors"
                      title="Minimize Widget"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact and Time Details */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-royal-900 border border-royal-650 flex items-center justify-center text-royal-400 font-bold shrink-0">
                    {activeCall.contactName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">{activeCall.contactName}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{activeCall.contactPhone} • {activeCall.direction}</p>
                  </div>
                  <div className="text-xl font-bold font-mono text-white tracking-wide shrink-0">
                    {formatTime(activeCall.duration)}
                  </div>
                </div>

                {/* Live Controls */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <button
                    onClick={() => dispatch(toggleMute())}
                    className={`py-2 rounded-lg border text-xs font-bold flex flex-col items-center space-y-1 transition-colors ${
                      activeCall.isMuted 
                        ? 'bg-amber-600/10 border-amber-500/30 text-amber-300'
                        : 'bg-dark-850 border-slate-800 text-slate-400 hover:bg-dark-800 hover:text-slate-200'
                    }`}
                  >
                    {activeCall.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>Mute</span>
                  </button>
                  <button
                    onClick={() => dispatch(toggleHold())}
                    className={`py-2 rounded-lg border text-xs font-bold flex flex-col items-center space-y-1 transition-colors ${
                      activeCall.isHeld 
                        ? 'bg-indigo-650/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-dark-850 border-slate-800 text-slate-400 hover:bg-dark-800 hover:text-slate-200'
                    }`}
                  >
                    {activeCall.isHeld ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>Hold</span>
                  </button>
                  <div className="py-2 rounded-lg border border-red-500/40 bg-red-650/15 text-red-400 text-xs font-bold flex flex-col items-center space-y-1 active-call-pulse" title="Call recording is mandatory">
                    <Square className="w-4 h-4 fill-red-500" />
                    <span>Recording</span>
                  </div>
                </div>

                {/* Live Notes Input */}
                <div className="bg-dark-950 border border-slate-850 rounded-xl p-3 mb-4">
                  <div className="flex items-center space-x-1.5 pb-1.5 border-b border-slate-900 mb-1.5 text-slate-500">
                    <FileText className="w-3.5 h-3.5 text-royal-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Live Call Notes</span>
                  </div>
                  <textarea
                    placeholder="Type notes during call..."
                    value={activeCall.notes}
                    onChange={(e) => dispatch(updateLiveNotes(e.target.value))}
                    className="w-full h-20 bg-transparent text-xs text-slate-200 placeholder-slate-650 focus:outline-none resize-none"
                  />
                </div>

                {/* End Call Button */}
                <button
                  onClick={handleEndCall}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg hover:shadow-red-500/10 active:scale-95 transition-all duration-200"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call & Log</span>
                </button>
              </div>
            )
          )}

          {/* Real-time Reminder Toasts */}
          {activeAlerts.length > 0 && !inCall && callStatus !== 'INCOMING' && (
            <div className="fixed bottom-6 right-6 space-y-2 max-w-sm z-50">
              {activeAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="p-4 bg-royal-900 border border-royal-700/50 shadow-glow-royal rounded-xl flex items-start space-x-3 backdrop-blur">
                  <div className="p-2 bg-royal-800 rounded-lg text-royal-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-semibold text-white">{alert.title}</h5>
                    <p className="text-[10px] text-slate-300 mt-0.5">{alert.contactName} ({alert.contactPhone})</p>
                    <div className="flex space-x-2 mt-2.5">
                      <button 
                        onClick={() => handleDismissReminder(alert.id)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                      >
                        Dismiss
                      </button>
                      <button 
                        onClick={() => handleCompleteReminder(alert.id)}
                        className="text-[10px] bg-royal-500 hover:bg-royal-400 text-white px-2 py-1 rounded font-medium transition-colors"
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
