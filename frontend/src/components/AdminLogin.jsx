import React, { useState, useEffect } from 'react';
import { verifyPassword, getAttendance, clearAttendance } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminLogin = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // New states for Dashboard features
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [exportMessage, setExportMessage] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0 });
  const [allStudents, setAllStudents] = useState([]);

  // Reset features
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState(null);


  useEffect(() => {
    if (isAuthenticated) {
      getAttendance().then(data => {
        const students = Array.isArray(data) ? data : [];
        setAllStudents(students);

        const branches = new Set();
        const semesters = new Set();
        students.forEach(s => {
          if (s.branch) branches.add(s.branch.trim().toUpperCase());
          if (s.semester) semesters.add(s.semester.trim());
        });
        setAvailableBranches(Array.from(branches).sort());
        const sortedSems = Array.from(semesters).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setAvailableSemesters(sortedSems);

        // Set initial filters to the first available values if any
        if (sortedSems.length > 0 && !selectedSemester) setSelectedSemester(sortedSems[0]);
        const sortedBranches = Array.from(branches).sort();
        if (sortedBranches.length > 0 && !selectedBranch) setSelectedBranch(sortedBranches[0]);

      }).catch(err => console.error("Error fetching filter data:", err));
    }
  }, [isAuthenticated]);

  // Recalculate stats whenever filters change
  useEffect(() => {
    if (allStudents.length > 0) {
      const filtered = allStudents.filter(s => {
        const sSem = (s.semester || '').trim().toLowerCase();
        const sBranch = (s.branch || '').trim().toLowerCase();
        const fSem = selectedSemester.toLowerCase();
        const fBranch = selectedBranch.toLowerCase();

        return (sSem === fSem || !fSem) && (sBranch === fBranch || !fBranch);
      });

      const total = filtered.length;
      const present = filtered.filter(s => s.isPresent).length;
      setStats({ total, present, absent: total - present });
    }
  }, [allStudents, selectedSemester, selectedBranch]);

  useEffect(() => {
    if (exportMessage) {
      const timer = setTimeout(() => {
        setExportMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [exportMessage]);

  // Remove auto-branch logic as it's now dynamic semester based

  const handleExportPDF = async () => {
    // Only require Semester and Branch if we are NOT doing a global "Present Only" export
    if (selectedStatus !== 'Present' && (!selectedSemester || !selectedBranch)) {
      setExportMessage('Please select both Semester and Branch to export.');
      return;
    }

    setIsExporting(true);
    setExportMessage(null);
    try {
      const data = await getAttendance();
      const students = Array.isArray(data) ? data : [];

      // Flexible filtering: apply filters only if they are selected
      const filtered = students.filter(s => {
        const sSem = (s.semester || '').trim().toLowerCase();
        const sBranch = (s.branch || '').trim().toLowerCase();
        const fSem = selectedSemester.toLowerCase();
        const fBranch = selectedBranch.toLowerCase();

        // 1. Status Filter (Primary)
        if (selectedStatus === 'Present' && !s.isPresent) return false;
        if (selectedStatus === 'Absent' && s.isPresent) return false;

        // 2. Semester/Branch Filters (Optional if Status is 'Present')
        if (fSem && sSem !== fSem) return false;
        if (fBranch && sBranch !== fBranch) return false;

        return true;
      });

      // Sort strictly: 1. Section, 2. Roll Number Prefix, 3. Roll Number Suffix (Numbers first)
      filtered.sort((a, b) => {
        const secA = (a.section || '').toString().toLowerCase();
        const secB = (b.section || '').toString().toLowerCase();
        
        // 1. Primary sort: Section
        const secCompare = secA.localeCompare(secB, undefined, { numeric: true, sensitivity: 'base' });
        if (secCompare !== 0) return secCompare;

        // 2. Secondary sort: Roll Number Logic
        const rollA = (a.rollNo || '').toString().trim();
        const rollB = (b.rollNo || '').toString().trim();
        
        // Split roll number into prefix (all but last 2) and suffix (last 2)
        const prefixA = rollA.slice(0, -2);
        const prefixB = rollB.slice(0, -2);
        const sufA = rollA.slice(-2);
        const sufB = rollB.slice(-2);
        
        // A. Compare Prefixes first
        const prefixCompare = prefixA.localeCompare(prefixB, undefined, { numeric: true, sensitivity: 'base' });
        if (prefixCompare !== 0) return prefixCompare;
        
        // B. If prefixes are identical, compare Suffixes with Numeric Preference
        const isSufNumA = /^\d+$/.test(sufA);
        const isSufNumB = /^\d+$/.test(sufB);
        
        // Numeric suffixes (01-99) come before alphanumeric/alphabet suffixes (A1, B2...)
        if (isSufNumA && !isSufNumB) return -1;
        if (!isSufNumA && isSufNumB) return 1;
        
        // If both in the same category, use standard alphabetic sort for suffixes
        return sufA.localeCompare(sufB, undefined, { numeric: true, sensitivity: 'base' });
      });

      if (filtered.length === 0) {
        setExportMessage("No students found matching these criteria");
        setIsExporting(false);
        return;
      }

      const doc = new jsPDF();
      const reportTitle = selectedStatus === 'Present' && (!selectedSemester || !selectedBranch)
        ? "Total Workshop Attendance - All Departments"
        : `Attendance Report - ${selectedSemester || 'All Sem'} - ${selectedBranch || 'All Branch'}`;

      doc.text(reportTitle, 14, 15);

      const tableColumn = ["S.No", "Roll No", "Name", "Section", "Branch", "Semester", "Status"];
      const tableRows = [];

      filtered.forEach((student, index) => {
        const studentData = [
          index + 1,
          student.rollNo || 'N/A',
          student.name || 'N/A',
          student.section || 'N/A',
          student.branch || 'N/A',
          student.semester || 'N/A',
          student.isPresent ? 'Present' : 'Absent'
        ];
        tableRows.push(studentData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });

      // Special Filename for Global "Present" list
      let fileName = "";
      if (selectedStatus === 'Present' && (!selectedSemester || !selectedBranch)) {
        fileName = "workshop_attended_allBranches.pdf";
      } else {
        const statusSuffix = selectedStatus !== 'All' ? `_${selectedStatus}` : '';
        const branchPrefix = selectedBranch || 'AllBranch';
        const semPrefix = selectedSemester || 'AllSem';
        fileName = `${branchPrefix}_${semPrefix}${statusSuffix}_Attendance.pdf`;
      }

      doc.save(fileName);
      setExportMessage(`Successfully exported ${filtered.length} students`);
    } catch (err) {
      setExportMessage("Error exporting data: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await verifyPassword(password);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || 'Invalid password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4 relative">
        {/* Back button */}
        <button
          onClick={() => {
            console.log("Navigating back to home...");
            onBack();
          }}
          className="fixed top-4 left-4 sm:top-6 sm:left-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 z-[100] shadow-xl backdrop-blur-md"
        >
          <span className="text-xl">←</span> Home
        </button>

        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10"
        >
          Logout
        </button>

        {/* Reset Attendance Button (Moved to top right under logout) */}
        <button
          onClick={() => setShowResetModal(true)}
          className="absolute top-16 right-4 sm:top-20 sm:right-6 text-red-500 hover:text-white flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer bg-red-500/10 hover:bg-red-500/30 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-red-500/20 shadow-lg backdrop-blur-md text-xs sm:text-sm font-medium z-50 whitespace-nowrap"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Clear All Presentees</span>
          <span className="inline sm:hidden">Clear All</span>
        </button>

        <div className="flex flex-col items-center w-full max-w-4xl animate-fade-in-up">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-full overflow-hidden bg-slate-900/80 border-[3px] border-primary/40 p-1 shadow-[0_0_25px_rgba(139,92,246,0.3)] flex items-center justify-center transition-all hover:border-primary hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] group backdrop-blur-xl scale-95 sm:scale-100">
            <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-lg transition-transform group-hover:scale-110 duration-500" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-rose-500 mb-8 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
            HOD Dashboard
          </h1>

          <div className="glass-card p-8 rounded-3xl w-full shadow-2xl relative overflow-hidden flex flex-col items-center justify-start min-h-[400px]">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-4 w-full mb-10 animate-fade-in-up stagger-1">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center group hover:bg-white/10 transition-all">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Total</span>
                <span className="text-3xl font-black text-white text-glow">{stats.total}</span>
              </div>
              <div className="bg-success/5 rounded-2xl p-4 border border-success/10 text-center group hover:bg-success/10 transition-all">
                <span className="text-xs font-bold text-success/60 uppercase tracking-widest block mb-1">Present</span>
                <span className="text-3xl font-black text-success text-glow">{stats.present}</span>
              </div>
              <div className="bg-danger/5 rounded-2xl p-4 border border-danger/10 text-center group hover:bg-danger/10 transition-all">
                <span className="text-xs font-bold text-danger/60 uppercase tracking-widest block mb-1">Absent</span>
                <span className="text-3xl font-black text-danger text-glow">{stats.absent}</span>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Portal Controls</h2>
            <p className="text-slate-400 mb-8 text-sm italic">Filter and export attendance records securely.</p>

            <div className="w-full max-w-md space-y-6">
              {/* Filters */}
              <div className="flex flex-col gap-4">
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Semester</label>
                  <div className="relative">
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                    >
                      <option value="" disabled>Choose Semester</option>
                      {availableSemesters.map(sem => (
                        <option key={sem} value={sem}>{sem}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Branch</label>
                  <div className="relative">
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                    >
                      <option value="" disabled>Choose Branch</option>
                      {availableBranches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Select Status</label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none cursor-pointer pr-10"
                    >
                      <option value="All">All Students</option>
                      <option value="Present">Present Only</option>
                      <option value="Absent">Absent Only</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Message */}
              {exportMessage && (
                <div
                  onClick={() => setExportMessage(null)}
                  className={`p-4 mt-4 rounded-xl text-sm font-medium border cursor-pointer animate-fade-in-up ${exportMessage.includes("No students") ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : exportMessage.includes("Error") ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"} transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <span>{exportMessage}</span>
                    <svg className="w-4 h-4 opacity-70 hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className={`w-full py-4 mt-2 bg-gradient-to-r from-success to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl shadow-lg shadow-success/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isExporting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>

              {/* Missing reset attendance button (moved above) */}
            </div>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-slide-up">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-500"></div>

              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-2xl font-black text-center text-white mb-2">Are you absolutely sure?</h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                This action will mark <strong className="text-red-400">all currently present students</strong> as absent. This is designed to reset the system for a new event. This action cannot be undone.
              </p>

              {resetError && (
                <div className="mb-4 p-3 bg-red-950 border border-red-900 text-red-400 text-xs rounded-lg text-center">
                  {resetError}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={async () => {
                    setIsResetting(true);
                    setResetError(null);
                    try {
                      // We pass the currently active password to verify authorization again
                      const res = await clearAttendance(password);

                      // Update local state to reflect the wipe
                      setAllStudents(prev => prev.map(s => ({ ...s, isPresent: false })));
                      setExportMessage(res.message || "Successfully cleared attendance.");
                      setShowResetModal(false);
                    } catch (err) {
                      setResetError(err.message);
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  disabled={isResetting}
                  className={`w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all ${isResetting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                >
                  {isResetting ? 'Clearing Data...' : 'Yes, Clear All Attendance'}
                </button>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetError(null);
                  }}
                  disabled={isResetting}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4 relative">
      {/* Back button */}
      <button
        onClick={() => {
          console.log("Navigating back to home...");
          onBack();
        }}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 z-[100] shadow-xl backdrop-blur-md"
      >
        <span className="text-xl">←</span> Home
      </button>

      {/* Main Content */}
      <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up">
        <div className="w-32 h-32 sm:w-40 sm:h-40 mb-8 rounded-full overflow-hidden bg-slate-900/80 border-[4px] border-primary/50 p-1.5 shadow-[0_0_40px_rgba(139,92,246,0.4)] flex items-center justify-center transition-all hover:border-primary hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] group backdrop-blur-3xl scale-100 glow-border">
          <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-2xl transition-transform group-hover:scale-110 duration-500" />
        </div>

        {/* Heading container */}
        <div className="text-center mb-10 w-full px-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-rose-500 mb-4 drop-shadow-[0_0_15px_rgba(139,92,246,0.4)] px-2">
            Admin Portal Authentication
          </h1>
          <div className="flex items-center justify-center gap-2 text-slate-400 font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
            Security Access Required
          </div>
        </div>

        {/* Login Box */}
        <div className="glass-card p-10 rounded-3xl border border-white/10 shadow-3xl w-full relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-500">
          {/* Decorative glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>

          <form onSubmit={handleLogin} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-400 text-xs italic">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 mt-4 bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-black rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
