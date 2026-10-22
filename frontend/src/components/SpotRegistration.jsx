import React, { useState } from 'react';
import { registerStudent } from '../services/api';

const SpotRegistration = ({ initialRollNo = '', onRegistered }) => {
    const [rollNo, setRollNo] = useState(initialRollNo);
    const [name, setName] = useState('');
    const [branch, setBranch] = useState('CSE');
    const [semester, setSemester] = useState('Semester 6');
    const [section, setSection] = useState('A');
    const [markPresent, setMarkPresent] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rollNo.trim() || !name.trim()) {
            setError('Please provide both Roll Number and Full Name.');
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const data = await registerStudent({
                rollNo: rollNo.trim().toUpperCase(),
                name: name.trim(),
                branch,
                semester,
                section,
                isPresent: markPresent
            });

            // Play success audio
            try {
                const audio = new Audio('/sounds/scan_success.mp3');
                audio.play().catch(() => {});
            } catch (e) {}

            setResult({
                message: data.message,
                student: data.student
            });

            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

            // Reset form for next entry
            setRollNo('');
            setName('');

            if (onRegistered) {
                onRegistered(data.student);
            }
        } catch (err) {
            setError(err.message);
            if (navigator.vibrate) navigator.vibrate(300);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-lg mx-auto p-6 sm:p-8 glass-card rounded-3xl shadow-3xl flex flex-col gap-6 animate-fade-in-up border border-white/10">
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    Spot Registration
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">On-The-Spot Registration</h3>
                <p className="text-slate-400 text-sm mt-1">Register walk-in students and instantly mark attendance</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">Roll Number *</label>
                        <input
                            type="text"
                            placeholder="e.g. 21B01A0520"
                            value={rollNo}
                            onChange={(e) => setRollNo(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-base focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition placeholder:text-slate-600"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">Student Name *</label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white text-base focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition placeholder:text-slate-600"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">Branch</label>
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                            <option value="CSE">CSE</option>
                            <option value="AI & DS">AI & DS</option>
                            <option value="ECE">ECE</option>
                            <option value="IT">IT</option>
                            <option value="MECH">MECH</option>
                            <option value="CIVIL">CIVIL</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">Semester</label>
                        <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                            <option value="Semester 1">Semester 1</option>
                            <option value="Semester 2">Semester 2</option>
                            <option value="Semester 3">Semester 3</option>
                            <option value="Semester 4">Semester 4</option>
                            <option value="Semester 5">Semester 5</option>
                            <option value="Semester 6">Semester 6</option>
                            <option value="Semester 7">Semester 7</option>
                            <option value="Semester 8">Semester 8</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-slate-400 font-bold text-xs uppercase tracking-wider ml-1">Section</label>
                        <select
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 cursor-pointer"
                        >
                            <option value="A">Section A</option>
                            <option value="B">Section B</option>
                            <option value="C">Section C</option>
                            <option value="D">Section D</option>
                        </select>
                    </div>
                </div>

                <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition mt-1">
                    <input
                        type="checkbox"
                        checked={markPresent}
                        onChange={(e) => setMarkPresent(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-cyan-500"
                    />
                    <span className="text-sm text-slate-300 font-medium">Mark as Present immediately upon registration</span>
                </label>

                <button
                    type="submit"
                    disabled={loading || !rollNo || !name}
                    className="cursor-pointer w-full py-4 mt-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-base rounded-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Registering Student...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Complete Registration
                        </>
                    )}
                </button>
            </form>

            {(result || error) && (
                <div className={`p-5 rounded-2xl text-center animate-fade-in border ${result ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    {result && (
                        <>
                            <div className="mx-auto w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <p className="text-green-400 font-extrabold text-base">{result.message}</p>
                            {result.student && (
                                <div className="mt-2 text-xs text-slate-300">
                                    <span className="font-bold text-white">{result.student.name}</span> ({result.student.rollNo}) &bull; {result.student.branch} {result.student.section}
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <>
                            <p className="text-red-400 font-bold text-sm">{error}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpotRegistration;
