import React, { useState, useEffect } from 'react';
import { verifyPassword, getAttendance, clearAttendance } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdminLogin = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // States for Dashboard features
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
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
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = () => {
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

      if (sortedSems.length > 0 && !selectedSemester) setSelectedSemester(sortedSems[0]);
      const sortedBranches = Array.from(branches).sort();
      if (sortedBranches.length > 0 && !selectedBranch) setSelectedBranch(sortedBranches[0]);

    }).catch(err => console.error("Error fetching filter data:", err));
  };

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

  const getFilteredList = () => {
    return allStudents.filter(s => {
      const sSem = (s.semester || '').trim().toLowerCase();
      const sBranch = (s.branch || '').trim().toLowerCase();
      const fSem = selectedSemester.toLowerCase();
      const fBranch = selectedBranch.toLowerCase();

      if (selectedStatus === 'Present' && !s.isPresent) return false;
      if (selectedStatus === 'Absent' && s.isPresent) return false;
      if (fSem && sSem !== fSem) return false;
      if (fBranch && sBranch !== fBranch) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesRoll = (s.rollNo || '').toLowerCase().includes(q);
        if (!matchesName && !matchesRoll) return false;
      }

      return true;
    }).sort((a, b) => {
      const rollA = (a.rollNo || '').toString().trim();
      const rollB = (b.rollNo || '').toString().trim();
      return rollA.localeCompare(rollB, undefined, { numeric: true });
    });
  };

  const handleExportPDF = async () => {
    if (selectedStatus !== 'Present' && (!selectedSemester || !selectedBranch)) {
      setExportMessage('Please select both Semester and Branch to export.');
      return;
    }

    setIsExporting(true);
    setExportMessage(null);
    try {
      const filtered = getFilteredList();

      if (filtered.length === 0) {
        setExportMessage("No students found matching these criteria");
        setIsExporting(false);
        return;
      }

      const doc = new jsPDF();
      const reportTitle = selectedStatus === 'Present' && (!selectedSemester || !selectedBranch)
        ? "Total Workshop Attendance - All Departments"
        : `Attendance Report - ${selectedSemester || 'All Sem'} - ${selectedBranch || 'All Branch'}`;

      doc.setFontSize(14);
      doc.text(reportTitle, 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Filter: Status=${selectedStatus}`, 14, 21);

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
        startY: 25,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });

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
      setExportMessage(`Successfully exported ${filtered.length} students to PDF.`);
    } catch (err) {
      setExportMessage("Error exporting data: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const filtered = getFilteredList();

      if (filtered.length === 0) {
        setExportMessage("No students found matching these criteria");
        setIsExporting(false);
        return;
      }

      const headers = ['S.No', 'Roll Number', 'Name', 'Section', 'Branch', 'Semester', 'Status'];
      const csvRows = [
        headers.join(','),
        ...filtered.map((s, idx) => [
          idx + 1,
          `"${s.rollNo}"`,
          `"${s.name}"`,
          `"${s.section || 'N/A'}"`,
          `"${s.branch || 'N/A'}"`,
          `"${s.semester || 'N/A'}"`,
          s.isPresent ? 'Present' : 'Absent'
        ].join(','))
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Attendance_${selectedBranch || 'All'}_${selectedSemester || 'All'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportMessage(`Successfully exported ${filtered.length} records to CSV.`);
    } catch (err) {
      setExportMessage("Error exporting CSV: " + err.message);
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
    const displayedStudents = getFilteredList();

    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center p-4 sm:p-8 relative w-full">
        {/* Navigation bar */}
        <div className="w-full max-w-5xl flex items-center justify-between mb-8 z-50">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 shadow-lg backdrop-blur-md text-sm font-semibold"
          >
            <span>&larr;</span> Role Selection
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowResetModal(true)}
              className="text-red-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-red-500/10 hover:bg-red-500/30 px-3.5 py-2 rounded-xl border border-red-500/20 shadow-lg text-xs sm:text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Reset Attendance</span>
            </button>

            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-xs sm:text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center w-full max-w-5xl animate-fade-in-up">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mb-4 rounded-full overflow-hidden bg-slate-900/80 border-[3px] border-primary/40 p-1 shadow-[0_0_25px_rgba(139,92,246,0.3)] flex items-center justify-center transition-all hover:border-primary hover:shadow-[0_0_35px_rgba(139,92,246,0.5)] group backdrop-blur-xl">
            <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-lg transition-transform group-hover:scale-110 duration-500" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-rose-500 mb-6 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
            HOD Analytics Dashboard
          </h1>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-4 w-full mb-8">
            <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/10 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Filtered</span>
              <span className="text-3xl sm:text-4xl font-black text-white">{stats.total}</span>
            </div>
            <div className="glass-card rounded-2xl p-4 sm:p-6 border border-green-500/20 text-center bg-green-500/5">
              <span className="text-xs font-bold text-green-400 uppercase tracking-widest block mb-1">Present</span>
              <span className="text-3xl sm:text-4xl font-black text-green-400">{stats.present}</span>
            </div>
            <div className="glass-card rounded-2xl p-4 sm:p-6 border border-rose-500/20 text-center bg-rose-500/5">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest block mb-1">Absent</span>
              <span className="text-3xl sm:text-4xl font-black text-rose-400">{stats.absent}</span>
            </div>
          </div>

          {/* Controls & Filter Panel */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl w-full shadow-2xl relative border border-white/10 mb-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Department Controls</h2>
                <p className="text-slate-400 text-xs sm:text-sm">Filter, search, and export official attendance reports.</p>
              </div>

              {/* Search bar */}
              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search Name or Roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-white text-sm focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 cursor-pointer outline-none"
                >
                  <option value="">All Semesters</option>
                  {availableSemesters.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 cursor-pointer outline-none"
                >
                  <option value="">All Branches</option>
                  {availableBranches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Attendance Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 cursor-pointer outline-none"
                >
                  <option value="All">All Students</option>
                  <option value="Present">Present Only</option>
                  <option value="Absent">Absent Only</option>
                </select>
              </div>
            </div>

            {/* Export message */}
            {exportMessage && (
              <div
                onClick={() => setExportMessage(null)}
                className={`p-4 mb-4 rounded-xl text-sm font-medium border cursor-pointer animate-fade-in ${exportMessage.includes("No students") ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : exportMessage.includes("Error") ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-green-500/10 border-green-500/20 text-green-400"}`}
              >
                <span>{exportMessage}</span>
              </div>
            )}

            {/* Export Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export Formatted PDF
              </button>

              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export CSV (Excel)
              </button>
            </div>
          </div>

          {/* Student Table Preview */}
          <div className="w-full bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl mb-12">
            <div className="p-4 bg-slate-900 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Records Preview ({displayedStudents.length} Students)
              </span>
              <button onClick={loadData} className="text-xs text-cyan-400 hover:underline">
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-950 border-b border-white/10 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Roll No</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Sem</th>
                    <th className="p-3">Sec</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedStudents.map((s, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-3 text-slate-500 text-xs">{idx + 1}</td>
                      <td className="p-3 font-mono text-cyan-400 font-semibold">{s.rollNo}</td>
                      <td className="p-3 text-white font-medium">{s.name}</td>
                      <td className="p-3 text-slate-400 text-xs">{s.branch}</td>
                      <td className="p-3 text-slate-400 text-xs">{s.semester}</td>
                      <td className="p-3 text-slate-400 text-xs">{s.section}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${s.isPresent ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {s.isPresent ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {displayedStudents.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-500">
                        No students match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-red-500/30 w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-red-500/20">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-2xl font-black text-center text-white mb-2">Reset All Attendance?</h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                This will mark <strong className="text-red-400">all currently present students</strong> as absent to prepare for a new session.
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
                      const res = await clearAttendance(password);
                      setAllStudents(prev => prev.map(s => ({ ...s, isPresent: false })));
                      setExportMessage(res.message || "Successfully reset attendance.");
                      setShowResetModal(false);
                    } catch (err) {
                      setResetError(err.message);
                    } finally {
                      setIsResetting(false);
                    }
                  }}
                  disabled={isResetting}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isResetting ? 'Clearing Data...' : 'Yes, Reset All Attendance'}
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
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

  // Admin Login Screen
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4 relative">
      <button
        onClick={onBack}
        className="fixed top-4 left-4 sm:top-6 sm:left-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 z-[100] shadow-xl backdrop-blur-md"
      >
        <span className="text-xl">&larr;</span> Role Selection
      </button>

      <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up">
        <div className="w-28 h-28 sm:w-36 sm:h-36 mb-6 rounded-full overflow-hidden bg-slate-900/80 border-[4px] border-primary/50 p-1.5 shadow-[0_0_40px_rgba(139,92,246,0.4)] flex items-center justify-center backdrop-blur-3xl glow-border">
          <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-2xl" />
        </div>

        <div className="text-center mb-8 w-full px-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-rose-500 mb-2">
            HOD Admin Portal
          </h1>
          <p className="text-slate-400 text-sm font-medium">Department Head Credentials Required</p>
        </div>

        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-white/10 shadow-3xl w-full relative">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
              <p className="text-[11px] text-slate-500 italic">Default password: admin123</p>
            </div>
            {error && <p className="text-red-400 text-xs italic bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent text-white font-black rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : (
                'Access HOD Portal'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
