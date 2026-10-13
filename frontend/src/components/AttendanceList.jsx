import React, { useEffect, useState } from 'react';
import { getAttendance } from '../services/api';

const AttendanceList = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearchTerm = React.useDeferredValue(searchTerm);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Initial fetch
        fetchData(true);

        // Setup background polling (every 20 seconds)
        const pollInterval = setInterval(() => {
            fetchData(false); // Silent fetch without full loading UI
        }, 20000);

        return () => clearInterval(pollInterval);
    }, []);

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const data = await getAttendance();
            setStudents(data);
            setError(null);
        } catch (err) {
            // Only set error if it's the initial load or a critical failure
            if (showLoading || !students.length) {
                setError(err.message);
            }
            console.warn("Polling Sync Issue:", err.message);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const sortedAndFilteredStudents = React.useMemo(() => {
        const filtered = students.filter(student =>
            (student.name || '').toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
            (student.rollNo || '').toString().toLowerCase().includes(deferredSearchTerm.toLowerCase())
        );

        // Sorting Logic: 1. Section, 2. Roll Number Prefix, 3. Roll Number Suffix (Numbers first)
        return filtered.sort((a, b) => {
            const secA = (a.section || '').toString().toLowerCase();
            const secB = (b.section || '').toString().toLowerCase();

            // 1. Primary sort: Section
            const secCompare = secA.localeCompare(secB, undefined, { numeric: true, sensitivity: 'base' });
            if (secCompare !== 0) return secCompare;

            // 2. Secondary sort: Roll Number Logic
            const rollA = (a.rollNo || '').toString().trim();
            const rollB = (b.rollNo || '').toString().trim();

            const prefixA = rollA.slice(0, -2);
            const prefixB = rollB.slice(0, -2);
            const sufA = rollA.slice(-2);
            const sufB = rollB.slice(-2);

            // A. Compare Prefixes
            const prefixCompare = prefixA.localeCompare(prefixB, undefined, { numeric: true, sensitivity: 'base' });
            if (prefixCompare !== 0) return prefixCompare;

            // B. If prefixes are identical, compare Suffixes (Numeric Priority)
            const isSufNumA = /^\d+$/.test(sufA);
            const isSufNumB = /^\d+$/.test(sufB);

            if (isSufNumA && !isSufNumB) return -1;
            if (!isSufNumA && isSufNumB) return 1;

            return sufA.localeCompare(sufB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [students, deferredSearchTerm]);

    const stats = {
        total: students.length,
        present: students.filter(s => s.isPresent).length,
        absent: students.length - students.filter(s => s.isPresent).length
    };

    const handleExport = () => {
        if (!students.length) return;

        // Create CSV Header
        const headers = ['Name', 'Roll Number', 'Section', 'Branch', 'Semester', 'Status'];

        // Use the same sorted list for CSV export
        const csvRows = [
            headers.join(','), // Header row
            ...sortedAndFilteredStudents.map(student => {
                const row = [
                    `"${student.name}"`, // Quote strings to handle commas
                    `"${student.rollNo}"`,
                    `"${student.section || 'N/A'}"`,
                    `"${student.branch}"`,
                    `"${student.semester || 'N/A'}"`,
                    student.isPresent ? 'Present' : 'Absent'
                ];
                return row.join(',');
            })
        ];

        // Create Blob and download
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) return (
        <div className="w-full text-center py-12">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 animate-pulse">Loading attendance records...</p>
        </div>
    );

    if (error) return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-red-900/10 border border-red-500/20 rounded-xl text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchData} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Retry</button>
        </div>
    );

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in-up">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-4 rounded-xl border border-white/5 bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Students</div>
                    <div className="text-3xl font-black text-white">{stats.total.toLocaleString()}</div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-success/10 bg-success/5 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                    <div className="text-success text-xs font-bold uppercase tracking-wider mb-1">Present</div>
                    <div className="text-3xl font-black text-success">{stats.present.toLocaleString()}</div>
                </div>
                <div className="glass-card p-4 rounded-xl border border-primary/10 bg-primary/5 shadow-[0_0_20px_rgba(139,92,246,0.05)]">
                    <div className="text-primary text-xs font-bold uppercase tracking-wider mb-1 text-primary/80">Pending</div>
                    <div className="text-3xl font-black text-primary/90">{stats.absent.toLocaleString()}</div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="relative w-full sm:max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search Name or Roll No..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleExport}
                        className="cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-accent text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Export CSV
                    </button>
                    <button onClick={fetchData} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all border border-white/5 active:rotate-180 duration-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-900 border-b border-white/10">
                            <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                                <th className="p-4 font-black">Name</th>
                                <th className="p-4 font-black">Roll Number</th>
                                <th className="p-4 font-black text-center">Section</th>
                                <th className="p-4 font-black">Branch</th>
                                <th className="p-4 font-black text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {sortedAndFilteredStudents.map((student, idx) => (
                                <tr
                                    key={idx}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="p-4 text-white font-medium group-hover:text-primary transition-colors">{student.name}</td>
                                    <td className="p-4 text-slate-400 font-mono text-xs">{student.rollNo}</td>
                                    <td className="p-4 text-center text-slate-400 font-bold text-xs uppercase">{student.section || 'N/A'}</td>
                                    <td className="p-4 text-slate-500 uppercase text-[10px] font-black tracking-wider">{student.branch}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${student.isPresent
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                            : 'bg-slate-800/50 text-slate-600 border border-white/5'
                                            }`}>
                                            {student.isPresent ? 'Present' : 'Absent'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {sortedAndFilteredStudents.length === 0 && (
                    <div className="text-center py-20">
                        <div className="text-slate-600 mb-2">
                            <svg className="w-12 h-12 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p className="text-slate-500 font-medium">No results matching "{searchTerm}"</p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center justify-between px-2">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Showing {sortedAndFilteredStudents.length} of {students.length} records
                </div>
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="text-[10px] text-primary font-bold uppercase tracking-widest hover:text-accent underline underline-offset-4"
                    >
                        Clear Filter
                    </button>
                )}
            </div>
        </div>
    );
};

export default AttendanceList;
