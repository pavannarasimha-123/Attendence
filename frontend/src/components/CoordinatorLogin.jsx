import React, { useState } from 'react';
import { verifyCoordinatorPassword } from '../services/api';

const CoordinatorLogin = ({ onLogin, onBack }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await verifyCoordinatorPassword(password);
            onLogin(); // Trigger parent transition
        } catch (err) {
            setError(err.message || 'Invalid password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4 relative w-full">
            {/* Back button */}
            <button
                onClick={onBack}
                className="fixed top-4 left-4 sm:top-6 sm:left-6 text-slate-400 hover:text-white flex items-center gap-2 transition-colors cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 z-[100] shadow-xl backdrop-blur-md"
            >
                <span className="text-xl">←</span> Change Role
            </button>

            {/* Main Content */}
            <div className="flex flex-col items-center w-full max-w-md animate-fade-in-up">
                <div className="w-32 h-32 sm:w-40 sm:h-40 mb-8 rounded-full overflow-hidden bg-slate-900/80 border-[4px] border-primary/50 p-1.5 shadow-[0_0_40px_rgba(139,92,246,0.4)] flex items-center justify-center transition-all hover:border-primary hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] group backdrop-blur-3xl scale-100 glow-border">
                    <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover drop-shadow-2xl transition-transform group-hover:scale-110 duration-500" />
                </div>

                {/* Heading container */}
                <div className="text-center mb-10 w-full px-4">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.4)] px-2">
                        Coordinator Portal
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-slate-400 font-medium tracking-wide">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></div>
                        Event Access Required
                    </div>
                </div>

                {/* Login Box */}
                <div className="glass-card p-10 rounded-3xl border border-white/10 shadow-3xl w-full relative overflow-hidden group hover:border-cyan-500/30 transition-all duration-500 bg-slate-900/40">
                    {/* Decorative glow */}
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>

                    <form onSubmit={handleLogin} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Event Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-600 text-lg shadow-inner"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {error && <p className="text-red-400 text-xs italic bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Authenticating...
                                </>
                            ) : (
                                'Enter Portal'
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-slate-500 text-xs font-medium tracking-wide flex items-center gap-2 opacity-60">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    Secure Event Access
                </div>
            </div>
        </div>
    );
};

export default CoordinatorLogin;
