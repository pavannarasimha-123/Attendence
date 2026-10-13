import React, { useState, useEffect } from 'react';
import { pingServer } from '../services/api';

const CSE_QUOTES = [
    "“Talk is cheap. Show me the code.” – Linus Torvalds",
    "“Any fool can write code that a computer can understand. Good programmers write code that humans can understand.” – Martin Fowler",
    "“First, solve the problem. Then, write the code.” – John Johnson",
    "“Experience is the name everyone gives to their mistakes.” – Oscar Wilde",
    "“In order to be irreplaceable, one must always be different.” – Coco Chanel",
    "“Java is to JavaScript what car is to Carpet.” – Chris Heilmann",
    "“Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday’s code.” – Dan Salomon",
    "“Perfection is achieved not when there is nothing more to add, but rather when there is nothing more to take away.” – Antoine de Saint-Exupery",
    "“Code is like humor. When you have to explain it, it’s bad.” – Cory House",
    "“Fix the cause, not the symptom.” – Steve Maguire"
];

const WAKEUP_TIME_SECONDS = 50;

const ServerWakeup = ({ onReady }) => {
    const [timeLeft, setTimeLeft] = useState(WAKEUP_TIME_SECONDS);
    const [quoteIndex, setQuoteIndex] = useState(Math.floor(Math.random() * CSE_QUOTES.length));
    const [isPinging, setIsPinging] = useState(true);

    // Quote rotation
    useEffect(() => {
        const quoteInterval = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % CSE_QUOTES.length);
        }, 5000); // Change quote every 5 seconds

        return () => clearInterval(quoteInterval);
    }, []);

    // Ping Server and Countdown
    useEffect(() => {
        let pingInterval;
        let timerInterval;

        const checkServer = async () => {
            const isReady = await pingServer();
            if (isReady) {
                setIsPinging(false);
                onReady();
            }
        };

        if (isPinging) {
            // Intial check immediately
            checkServer();

            // Ping every 3 seconds
            pingInterval = setInterval(checkServer, 3000);

            // Countdown Timer
            timerInterval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        return 0; // Stick at 0 while continuing to ping
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            clearInterval(pingInterval);
            clearInterval(timerInterval);
        };
    }, [isPinging, onReady]);


    // Format time as MM:SS
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4 relative w-full overflow-hidden">
            {/* Background aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-900/20 via-slate-900 to-indigo-900/20"></div>

            <div className="flex flex-col items-center w-full max-w-lg z-10 animate-fade-in text-center px-4">

                {/* Loading Spinner / Server Icon */}
                <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-purple-500/20 border-b-purple-400 rounded-full animate-spin-slow reverse"></div>
                    <div className="bg-slate-900 p-4 rounded-full border border-white/10 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                        <svg className="w-10 h-10 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black mb-4 text-white">
                    Waking up Cloud Server
                </h1>

                <p className="text-slate-400 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                    Because we use a free-tier hosting service, the server spins down when inactive. Please wait while we boot it back up!
                </p>

                {/* Timer Display */}
                <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-12 shadow-xl hover:border-cyan-500/30 transition-colors inline-block min-w-[200px]">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Estimated Time</div>
                    <div className={`text-5xl font-mono font-black tracking-tight ${timeLeft === 0 ? 'text-cyan-400 animate-pulse' : 'text-white text-glow'}`}>
                        {formatTime(timeLeft)}
                    </div>
                    {timeLeft === 0 && (
                        <div className="text-cyan-400 text-xs mt-2 font-medium tracking-wide">
                            Server should be ready any moment...
                        </div>
                    )}
                </div>

                {/* Quotes */}
                <div className="h-24 flex items-center justify-center">
                    <p className="text-slate-300 italic text-sm sm:text-base px-6 border-l-2 border-cyan-500/50 transition-opacity duration-500 opacity-80 max-w-md">
                        {CSE_QUOTES[quoteIndex]}
                    </p>
                </div>

            </div>
        </div>
    );
};

export default ServerWakeup;
