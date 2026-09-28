import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Phone, 
  PhoneCall,
  Delete
} from 'lucide-react';
import { 
  startOutboundCall
} from '../store/callSlice';

export default function Dialer() {
  const dispatch = useDispatch();
  const activeCall = useSelector((state) => state.calls.activeCall);
  const callStatus = useSelector((state) => state.calls.callStatus);
  const contacts = useSelector((state) => state.contacts.list);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [showContactMatches, setShowContactMatches] = useState(false);
  const contactMatches = phoneNumber.trim().length >= 2
    ? contacts.filter(contact => contact.name.toLowerCase().includes(phoneNumber.toLowerCase()) || contact.phone.includes(phoneNumber)).slice(0, 6)
    : [];

  const handleKeypadPress = (val) => {
    setPhoneNumber(prev => prev + val);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleStartCall = () => {
    if (!phoneNumber) return;
    
    // Find matching contact if any
    const contact = contacts.find(c => c.phone.replace(/\D/g, '') === phoneNumber.replace(/\D/g, '')) || {
      name: 'Unknown Number',
      phone: phoneNumber
    };

    dispatch(startOutboundCall(contact));
    setPhoneNumber(''); // clear input
  };

  const selectContact = (contact) => {
    setPhoneNumber(contact.phone);
    setShowContactMatches(false);
  };

  const inCallMode = callStatus !== 'IDLE' && callStatus !== 'INCOMING';

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        // If they are in the dialer input, allow Enter to submit
        if (document.activeElement.id === 'dialer-input' && e.key === 'Enter') {
          handleStartCall();
        }
        return;
      }

      if (inCallMode) return;

      const validKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
      
      if (validKeys.includes(e.key)) {
        setPhoneNumber(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setPhoneNumber(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleStartCall();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [inCallMode, contacts, phoneNumber]); // dependencies needed so handleStartCall uses latest values

  return (
    <div className="glass-panel border border-slate-800 rounded-2xl p-6 h-full flex flex-col justify-between shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-royal-800/10 rounded-full blur-3xl pointer-events-none"></div>

      {!inCallMode ? (
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">Phone Dialer</h3>
            
            <div className="relative flex items-center bg-dark-900 border border-slate-800 rounded-xl px-4 py-3 mb-6">
              <input
                id="dialer-input"
                type="text"
                placeholder="Enter number or saved contact name..."
                value={phoneNumber}
                onChange={(e) => { setPhoneNumber(e.target.value); setShowContactMatches(true); }}
                onFocus={() => setShowContactMatches(true)}
                className="w-full bg-transparent text-xl font-semibold text-white tracking-wide placeholder-slate-650 focus:outline-none pr-8"
              />
              {phoneNumber && (
                <button 
                  onClick={handleBackspace}
                  className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Delete className="w-5 h-5" />
                </button>
              )}
              {showContactMatches && contactMatches.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-dark-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                  <p className="px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-slate-500 border-b border-slate-800">Saved contacts</p>
                  {contactMatches.map(contact => (
                    <button key={contact.id} type="button" onClick={() => selectContact(contact)} className="w-full text-left px-3 py-2.5 hover:bg-dark-800 transition-colors">
                      <span className="block text-sm font-semibold text-slate-200">{contact.name}</span>
                      <span className="block text-xs text-slate-500">{contact.phone}{contact.company ? ` · ${contact.company}` : ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-y-4 gap-x-2 max-w-xs mx-auto justify-items-center mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleKeypadPress(digit)}
                  className="keypad-btn"
                >
                  <span className="text-lg font-bold">{digit}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleStartCall}
            disabled={!phoneNumber}
            className={`w-full py-4 rounded-xl flex items-center justify-center space-x-2 font-bold transition-all duration-200 active:scale-95 ${
              phoneNumber 
                ? 'bg-gradient-to-r from-royal-700 to-royal-500 text-white shadow-glow-royal hover:shadow-glow-royal-lg hover:from-royal-600 hover:to-royal-400'
                : 'bg-dark-800 text-slate-500 border border-slate-850 cursor-not-allowed'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span>Call Number</span>
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-royal-900 border border-royal-500 flex items-center justify-center animate-pulse">
            <PhoneCall className="w-7 h-7 text-royal-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">Line Busy</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
              Active call with <strong className="text-slate-350">{activeCall?.contactName}</strong> is currently active.
            </p>
            <p className="text-[10px] text-slate-600 mt-2">
              Use the persistent caller widget at the bottom right of the screen to manage the call from any tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
