import React, { useState, useEffect } from 'react';
import Scanner from './components/Scanner';
import ManualEntry from './components/ManualEntry';
import AttendanceList from './components/AttendanceList';
import AdminLogin from './components/AdminLogin';
import SplashScreen from './components/SplashScreen';
import CoordinatorLogin from './components/CoordinatorLogin';
import RoleSelection from './components/RoleSelection';
import ServerWakeup from './components/ServerWakeup';
import SpotRegistration from './components/SpotRegistration';
import QRGenerator from './components/QRGenerator';
import { getServerStatus } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [showSplash, setShowSplash] = useState(true);

  // 'none', 'coordinator', 'hod'
  const [selectedRole, setSelectedRole] = useState('none');
  const [isCoordinatorLoggedIn, setIsCoordinatorLoggedIn] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [systemMode, setSystemMode] = useState(null);
  const [prefilledRoll, setPrefilledRoll] = useState('');

  useEffect(() => {
    if (serverReady) {
      getServerStatus().then(status => {
        setSystemMode(status.mode);
      }).catch(() => {});
    }
  }, [serverReady]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // 0. Server Wakeup / Ping Check
  if (!serverReady) {
    return <ServerWakeup onReady={() => setServerReady(true)} />;
  }

  // 1. Role Selection Gateway
  if (selectedRole === 'none') {
    return <RoleSelection onSelectRole={(role) => setSelectedRole(role)} />;
  }

  // 2. Coordinator Flow
  if (selectedRole === 'coordinator') {
    if (!isCoordinatorLoggedIn) {
      return (
        <CoordinatorLogin
          onLogin={() => setIsCoordinatorLoggedIn(true)}
          onBack={() => setSelectedRole('none')}
        />
      );
    }
    // Main App below...
  } else if (selectedRole === 'hod') {
    // 3. HOD Flow
    return <AdminLogin onBack={() => setSelectedRole('none')} />;
  }

  const handleCoordinatorLogout = () => {
    setIsCoordinatorLoggedIn(false);
    setSelectedRole('none');
  };

  const handleNavigateToSpot = (roll) => {
    setPrefilledRoll(roll || '');
    setActiveTab('spot');
  };

  return (
    <div className="min-h-screen bg-[--color-background] text-[--color-secondary] flex flex-col items-center py-8 px-4 transition-colors duration-300 relative selection:bg-cyan-500/30">

      {/* Top Navbar: Role Switcher & System Status */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-2">
        <button
          onClick={handleCoordinatorLogout}
          className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-xs font-semibold backdrop-blur-md"
        >
          <span>&larr;</span> Change Role / Logout
        </button>

        <div className="flex items-center gap-2">
          {systemMode === 'google_sheets' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              Google Sheets Synced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Local Database Active
            </span>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="mb-6 text-center flex flex-col items-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mb-4 rounded-full overflow-hidden bg-slate-900/80 border-[3px] border-primary/40 p-1 shadow-[0_0_30px_rgba(139,92,246,0.2)] flex items-center justify-center transition-all hover:border-primary hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] group backdrop-blur-xl scale-95 sm:scale-100 glow-border">
          <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-lg transition-transform group-hover:scale-110 duration-700 ease-out" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-500 to-cyan-400 mb-2 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-pulse-slow text-glow">
          Smart Attendance
        </h1>
        <div className="flex items-center gap-2">
          <span className="w-8 h-px bg-gradient-to-r from-transparent to-slate-600"></span>
          <p className="text-slate-400 font-bold tracking-[0.2em] text-xs uppercase opacity-80">Event Coordinator Portal</p>
          <span className="w-8 h-px bg-gradient-to-l from-transparent to-slate-600"></span>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex glass-card p-1.5 rounded-2xl border border-white/5 mb-8 overflow-x-auto max-w-full shadow-2xl animate-fade-in-up stagger-2 gap-1">
        <button
          onClick={() => setActiveTab('scan')}
          className={`cursor-pointer px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'scan'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
          QR Scanner
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`cursor-pointer px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'manual'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          Manual Entry
        </button>

        <button
          onClick={() => {
            setPrefilledRoll('');
            setActiveTab('spot');
          }}
          className={`cursor-pointer px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'spot'
            ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Spot Registration
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`cursor-pointer px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'list'
            ? 'bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          Attendance List
        </button>

        <button
          onClick={() => setActiveTab('qr')}
          className={`cursor-pointer px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'qr'
            ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          QR & Badges
        </button>
      </div>

      {/* Content Area */}
      <main className="w-full max-w-4xl">
        {activeTab === 'scan' && (
          <div className="animate-fade-in">
            <Scanner onNavigateToSpot={handleNavigateToSpot} />
          </div>
        )}
        {activeTab === 'manual' && (
          <div className="animate-fade-in">
            <ManualEntry onNavigateToSpot={handleNavigateToSpot} />
          </div>
        )}
        {activeTab === 'spot' && (
          <div className="animate-fade-in">
            <SpotRegistration initialRollNo={prefilledRoll} />
          </div>
        )}
        {activeTab === 'list' && (
          <div className="animate-fade-in">
            <AttendanceList />
          </div>
        )}
        {activeTab === 'qr' && (
          <div className="animate-fade-in">
            <QRGenerator />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} CSE Department | <span className="opacity-50">Smart Attendance System</span>
      </footer>
    </div>
  );
}

export default App;
