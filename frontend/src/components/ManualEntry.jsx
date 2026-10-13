import React, { useState } from 'react';
import { markAttendance } from '../services/api';

const ManualEntry = () => {
    const [rollNo, setRollNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rollNo) return;

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const data = await markAttendance(rollNo);

            // Play success sound
            const audio = new Audio('/sounds/scan_success.mp3');
            audio.play().catch(e => console.warn("Audio play failed", e));

            setResult({
                message: data.message,
                student: data.student
            });
            setRollNo(''); // Clear input on success
            if (navigator.vibrate) navigator.vibrate(200);
        } catch (err) {
            setError(err.message);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 glass-card rounded-2xl shadow-3xl flex flex-col gap-6 animate-fade-in-up stagger-1">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-white tracking-wide">Manual Entry</h3>
                <p className="text-slate-400 text-sm mt-1">Enter Roll Number if QR scan fails</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <label className="text-slate-400 font-semibold text-xs uppercase tracking-wider ml-1">Roll Number</label>
                    <input
                        type="text"
                        placeholder="e.g. 21B01A0XXX"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        className="w-full px-4 py-4 rounded-xl bg-slate-900/50 border border-white/10 text-white text-lg font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-slate-900 transition placeholder:text-slate-600"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !rollNo}
                    className="cursor-pointer w-full px-6 py-4 bg-primary text-white font-bold text-lg rounded-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                            Updating...
                        </span>
                    ) : 'Mark Attendance'}
                </button>
            </form>

            {(result || error) && (
                <div className={`p-6 rounded-xl text-center animate-fade-in-up border backdrop-blur-md ${result ? 'bg-green-900/10 border-green-500/20' : 'bg-red-900/10 border-red-500/20'}`}>
                    {result && (
                        <>
                            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <p className="text-green-400 font-extrabold text-xl tracking-wide drop-shadow-sm">{result.message}</p>
                            {result.student && (
                                <div className="mt-3 p-3 bg-black/20 rounded-lg border border-white/5 mx-auto max-w-[200px]">
                                    <span className="font-bold block text-white text-lg">{result.student.name}</span>
                                    <span className="text-white/60 font-mono text-sm">{result.student.rollNo}</span>
                                    {result.student.section && (
                                        <span className="text-primary/80 font-bold text-[10px] uppercase block mt-1 tracking-widest border-t border-white/5 pt-1">
                                            SEC: {result.student.section}
                                        </span>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <>
                            <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 border border-amber-500/20">
                                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <p className="text-slate-200 font-bold mb-1">Coordinator Note</p>
                            <p className="text-slate-400 text-sm">
                                {error.toLowerCase().includes('server') || error.toLowerCase().includes('failed to fetch')
                                    ? "The system is currently syncing multiple records. Please wait a moment and try again."
                                    : error}
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ManualEntry;
