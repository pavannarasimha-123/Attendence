import React from 'react';

const RoleSelection = ({ onSelectRole }) => {
    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col items-center justify-center p-4 relative w-full overflow-hidden font-sans">
            {/* Animated Aurora Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-aurora-1/20 rounded-full blur-[120px] animate-aurora"></div>
                <div className="absolute top-[10%] -right-[10%] w-[60%] h-[60%] bg-aurora-2/20 rounded-full blur-[100px] animate-aurora" style={{ animationDelay: '-5s' }}></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] bg-aurora-3/10 rounded-full blur-[110px] animate-aurora" style={{ animationDelay: '-10s' }}></div>
                <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-aurora-4/15 rounded-full blur-[90px] animate-aurora" style={{ animationDelay: '-15s' }}></div>
            </div>

            <div className="flex flex-col items-center w-full max-w-4xl animate-fade-in-up z-10">

                <div className="relative group mb-8">
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse-slow"></div>
                    <div className="w-28 h-28 sm:w-36 sm:h-36 relative rounded-full overflow-hidden bg-slate-900/80 border-[3px] border-white/10 p-1.5 shadow-[0_0_50px_rgba(139,92,246,0.3)] flex items-center justify-center backdrop-blur-3xl">
                        <img src="/logo.png" alt="Smart Attendance Logo" className="w-full h-full rounded-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                </div>

                <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-cyan-400 mb-4 drop-shadow-[0_0_20px_rgba(139,92,246,0.5)] text-center">
                    Select Your Portal
                </h1>

                <p className="text-slate-400 mb-16 text-center text-base sm:text-lg max-w-lg font-medium opacity-80">
                    Access your specialized workspace with department-grade tools and real-time insights.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-4">

                    {/* Coordinator Card */}
                    <button
                        onClick={() => onSelectRole('coordinator')}
                        className="group relative flex flex-col items-center p-10 bg-white/[0.03] backdrop-blur-2xl border border-white/10 hover:border-cyan-500/40 rounded-[2.5rem] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(34,211,238,0.15)] hover:-translate-y-3 cursor-pointer text-center overflow-hidden shimmer-effect animate-float"
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>

                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                            <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>

                        <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">Event Coordinator</h3>
                        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                            Seamlessly scan QR codes, manage manual entries, and monitor arrivals in real-time.
                        </p>
                    </button>

                    {/* HOD Card */}
                    <button
                        onClick={() => onSelectRole('hod')}
                        className="group relative flex flex-col items-center p-10 bg-white/[0.03] backdrop-blur-2xl border border-white/10 hover:border-purple-500/40 rounded-[2.5rem] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(168,85,247,0.15)] hover:-translate-y-3 cursor-pointer text-center overflow-hidden shimmer-effect animate-float"
                        style={{ animationDelay: '0.5s' }}
                    >
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>

                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>

                        <h3 className="text-3xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">HOD Dashboard</h3>
                        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                            Analyze department analytics, generate reports, and oversee the entire attendance ecosystem.
                        </p>
                    </button>

                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-8 text-slate-500 text-sm font-medium tracking-widest uppercase opacity-60">
                &copy; {new Date().getFullYear()} CSE Department
            </div>
        </div>
    );
};

export default RoleSelection;
