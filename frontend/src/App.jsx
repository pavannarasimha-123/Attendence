import React, { useState } from 'react';
import Scanner from './components/Scanner';
import ManualEntry from './components/ManualEntry';
import AttendanceList from './components/AttendanceList';
import AdminLogin from './components/AdminLogin';
import SplashScreen from './components/SplashScreen';
import CoordinatorLogin from './components/CoordinatorLogin';
import RoleSelection from './components/RoleSelection';
import ServerWakeup from './components/ServerWakeup';


function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [showSplash, setShowSplash] = useState(true);

  // 'none', 'coordinator', 'hod'
  const [selectedRole, setSelectedRole] = useState('none');
  const [isCoordinatorLoggedIn, setIsCoordinatorLoggedIn] = useState(false);
  const [serverReady, setServerReady] = useState(false);

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

  return (
    <div className="min-h-screen bg-[--color-background] text-[--color-secondary] flex flex-col items-center py-8 px-4 transition-colors duration-300 relative selection:bg-cyan-500/30">


      {/* Header */}
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-full overflow-hidden bg-slate-900/80 border-[3px] border-primary/40 p-1 shadow-[0_0_30px_rgba(139,92,246,0.2)] flex items-center justify-center transition-all hover:border-primary hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] group backdrop-blur-xl scale-95 sm:scale-100 glow-border">
          <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-lg transition-transform group-hover:scale-110 duration-700 ease-out" />
        </div>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-500 to-cyan-400 mb-2 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)] animate-pulse-slow text-glow">
          Smart Attendance
        </h1>
        <div className="flex items-center gap-2">
          <span className="w-8 h-px bg-gradient-to-r from-transparent to-slate-600"></span>
          <p className="text-slate-400 font-bold tracking-[0.2em] text-xs uppercase opacity-80">Event Coordinator Portal</p>
          <span className="w-8 h-px bg-gradient-to-l from-transparent to-slate-600"></span>
        </div>
      </header>

      {/* Toggle */}
      <div className="flex glass-card p-1.5 rounded-2xl border border-white/5 mb-10 overflow-x-auto max-w-full shadow-2xl animate-fade-in-up stagger-2">
        <button
          onClick={() => setActiveTab('scan')}
          className={`cursor-pointer px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'scan'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          QR Scanner
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`cursor-pointer px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-bold transition-all duration-200 whitespace-nowrap ${activeTab === 'manual'
            ? 'bg-primary text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`cursor-pointer px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === 'list'
            ? 'bg-gradient-to-r from-primary to-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-105'
            : 'text-slate-500 hover:text-slate-200'
            }`}
        >
          List
        </button>
      </div>

      {/* Content */}
      <main className="w-full max-w-4xl">
        {activeTab === 'scan' && (
          <div className="animate-fade-in">
            <Scanner />
          </div>
        )}
        {activeTab === 'manual' && (
          <div className="animate-fade-in">
            <ManualEntry />
          </div>
        )}
        {activeTab === 'list' && (
          <div className="animate-fade-in">
            <AttendanceList />
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
