import React, { useEffect, useState } from 'react';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 500); // Wait for fade-out animation
        }, 3000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[--color-background] transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="relative flex flex-col items-center">
                {/* Logo with pulsating glow */}
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-8 rounded-full overflow-hidden bg-slate-900 border-[3px] border-primary/40 p-1 shadow-[0_0_50px_rgba(139,92,246,0.3)] animate-pulse-slow">
                    <img
                        src="/logo.png"
                        alt="Smart Attendance Logo"
                        className="w-full h-full rounded-full object-cover shadow-2xl"
                    />
                </div>

                {/* Caption */}
                <div className="text-center space-y-2 animate-fade-in-up">
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-danger drop-shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                        Smart Attendance
                    </h1>
                    <div className="flex items-center justify-center gap-2">
                        <span className="w-10 h-px bg-gradient-to-r from-transparent to-slate-600"></span>
                        <p className="text-slate-400 font-bold tracking-[0.3em] text-[10px] sm:text-xs uppercase opacity-80">
                            Made by CSE
                        </p>
                        <span className="w-10 h-px bg-gradient-to-l from-transparent to-slate-600"></span>
                    </div>
                </div>

                {/* Loading indicator */}
                <div className="mt-12 flex flex-col items-center gap-3">
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-progress-bar"></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                        Initializing Secure Portal...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
