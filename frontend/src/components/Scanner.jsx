import React, { useEffect, useState, useRef, useCallback } from 'react';
import { markAttendance } from '../services/api';
import scannerService from '../services/scannerService';

const Scanner = ({ onScanSuccess, onScan, autoStart = false, id = "reader-custom" }) => {
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameras, setCameras] = useState([]);
    const [activeCameraId, setActiveCameraId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentMsg, setCurrentMsg] = useState("Syncing with Cloud...");
    const [queueDepth, setQueueDepth] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

    const PROFESSIONAL_MSGS = [
        "Syncing student record...",
        "Validating entry portal...",
        "Updating attendance cloud...",
        "Processing secure scan...",
        "Registering attendance...",
        "Connecting to cloud server...",
        "Finalizing registration..."
    ];

    const lastScannedCode = useRef(null);
    const lastScannedTime = useRef(0);
    const COOLDOWN_MS = 3000;
    const successAudio = useRef(new Audio('/sounds/scan_success.mp3'));

    const readerId = id;

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            if (autoStart) {
                await new Promise(r => setTimeout(r, 100));
                if (isMounted) startScanning();
            }
        };
        init();
        return () => {
            isMounted = false;
            scannerService.clearSafe();
        };
    }, [autoStart, readerId]);

    const startScanning = useCallback(async (cameraIdToUse = null) => {
        setScanError(null);
        const element = document.getElementById(readerId);
        if (!element) {
            setScanError("Camera Error: Element not ready. Please retry.");
            return;
        }

        try {
            let config = {
                fps: 30,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const edge = Math.floor(minEdge * 0.85);
                    return { width: edge, height: edge };
                },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
                focusMode: "continuous"
            };

            const handleScanResult = (t) => handleScan(t);
            const handleScanError = () => { };

            if (cameraIdToUse) {
                await scannerService.startSafe(readerId, cameraIdToUse, config, handleScanResult, handleScanError);
                setActiveCameraId(cameraIdToUse);
            } else {
                try {
                    await scannerService.startSafe(readerId, { facingMode: "environment" }, config, handleScanResult, handleScanError);
                    setIsScanning(true);
                    const { Html5Qrcode } = await import('html5-qrcode');
                    Html5Qrcode.getCameras().then(available => {
                        setCameras(available);
                    }).catch(e => console.warn("Camera list fetch failed", e));

                } catch (err) {
                    const { Html5Qrcode } = await import('html5-qrcode');
                    const availableCameras = await Html5Qrcode.getCameras();
                    setCameras(availableCameras);

                    if (availableCameras.length > 0) {
                        const backCamera = availableCameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
                        const targetId = backCamera ? backCamera.id : availableCameras[0].id;
                        setActiveCameraId(targetId);
                        await scannerService.startSafe(readerId, targetId, config, handleScanResult, handleScanError);
                    } else {
                        await scannerService.startSafe(readerId, { facingMode: "user" }, config, handleScanResult, handleScanError);
                    }
                }
            }
            setIsScanning(true);
        } catch (err) {
            let msg = err.message || "Unknown error starting camera";
            setScanError(`Camera Error: ${msg}`);
        }
    }, [cameras, readerId]);

    const stopScanning = async () => {
        await scannerService.stopSafe();
        setIsScanning(false);
    };

    const handleSwitchCamera = async () => {
        if (cameras.length < 2) return;
        await stopScanning();
        const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        startScanning(cameras[nextIndex].id);
    };

    const handleScan = async (rawText) => {
        const rollNo = rawText.trim();
        const now = Date.now();

        if (isProcessing) return;

        if (rollNo === lastScannedCode.current && (now - lastScannedTime.current < COOLDOWN_MS)) {
            return;
        }

        lastScannedCode.current = rollNo;
        lastScannedTime.current = now;

        if (navigator.vibrate) try { navigator.vibrate(200); } catch (e) { }

        if (onScan) {
            onScan(rollNo);
            return;
        }

        await processMarkAttendance(rollNo);
    };

    const idleTimeoutRef = useRef(null);

    const resetIdleTimeout = useCallback(() => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = setTimeout(() => {
            console.log("Scanner idle for 5 mins, stopping camera to save battery/thermal.");
            stopScanning();
            setScanError("Scanner paused due to inactivity. Tap 'Start Camera' to resume.");
        }, 300000); // 5 minutes
    }, []);

    useEffect(() => {
        if (isScanning) {
            resetIdleTimeout();
            window.addEventListener('touchstart', resetIdleTimeout);
            window.addEventListener('mousemove', resetIdleTimeout);
        }
        return () => {
            window.removeEventListener('touchstart', resetIdleTimeout);
            window.removeEventListener('mousemove', resetIdleTimeout);
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        };
    }, [isScanning, resetIdleTimeout]);

    const processMarkAttendance = async (rollNo, attempt = 0) => {
        setIsProcessing(true);
        setScanError(null);
        setScanResult(null);
        resetIdleTimeout(); // Activity detected

        // Pick a dynamic professional message
        const randomMsg = PROFESSIONAL_MSGS[Math.floor(Math.random() * PROFESSIONAL_MSGS.length)];
        setCurrentMsg(randomMsg);

        try {
            const data = await markAttendance(rollNo);

            // Play iPhone 15 Success Sound
            if (successAudio.current) {
                successAudio.current.currentTime = 0;
                successAudio.current.play().catch(e => console.warn("Audio play failed", e));
            }

            if (navigator.vibrate) try { navigator.vibrate([100, 50, 100]); } catch (e) { }
            setScanResult({
                message: data.message,
                student: data.student,
                timestamp: new Date().toLocaleTimeString()
            });
            setQueueDepth(data.queueDepth || 0);
            setScanError(null);
            setIsProcessing(false);
            onScanSuccess && onScanSuccess(data);
        } catch (err) {
            setQueueDepth(err.response?.data?.queueDepth || 0);

            // Check for Rate Limit or Timeout specifically from our new backend logic
            const isTimeout = err.message.toLowerCase().includes('timeout');
            const isRateLimit = err.message.toLowerCase().includes('syncing') || err.message.toLowerCase().includes('handle multiple scans');

            // Professional Auto-Retry logic
            if (attempt < 1) {
                console.log(`Scan failed, retrying... Attempt ${attempt + 1}`);
                setScanError(isTimeout ? "Cloud connection slow, retrying..." : "Syncing with cloud...");
                setTimeout(() => processMarkAttendance(rollNo, attempt + 1), 1500);
                return;
            }

            setIsProcessing(false);
            // Professional Error Messaging
            let friendlyError = err.message;
            if (err.message.toLowerCase().includes('server') || err.message.toLowerCase().includes('failed to fetch') || isTimeout) {
                friendlyError = "The system is currently handling multiple scans. Please wait 2 seconds and try again.";
            }

            setScanError(friendlyError);
            setScanResult(null);
            if (navigator.vibrate) try { navigator.vibrate(400); } catch (e) { }
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-4">
            <style>{`
                #${readerId} video {
                    object-fit: cover !important;
                    width: 100% !important;
                    height: 100% !important;
                    border-radius: 1.5rem;
                    position: relative;
                    z-index: 5;
                }
                #${readerId} {
                    background: #000;
                    border-radius: 1.5rem;
                    overflow: hidden;
                }
            `}</style>

            <div className="relative w-full aspect-[4/5] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                <div className="absolute inset-0 z-0 bg-black">
                    <div id={readerId} className="w-full h-full"></div>
                </div>

                {!isScanning && !scanResult && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-slate-300 p-6 text-center transition-all duration-300">
                        {!scanError && (
                            <div className="mb-4 p-4 bg-white/5 rounded-full border border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                            </div>
                        )}

                        {!scanError ? (
                            <>
                                <h3 className="text-white text-xl font-bold mb-1 tracking-tight">Ready to Scan</h3>
                                <button
                                    onClick={() => startScanning()}
                                    className="cursor-pointer mt-6 px-8 py-3 bg-primary text-white font-bold rounded-full shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:shadow-[0_0_25px_rgba(139,92,246,0.8)] hover:scale-105 transition transform flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Start Camera
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center">
                                <p className="text-red-400 text-sm mb-4 bg-red-950/30 px-3 py-1 rounded-lg border border-red-900/50">{scanError.replace('Camera Error:', '')}</p>
                                <button onClick={() => startScanning()} className="cursor-pointer px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-full border border-slate-700 hover:bg-slate-700 transition">Retry</button>
                            </div>
                        )}
                    </div>
                )}

                {isScanning && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-white/50 rounded-tl-lg"></div>
                        <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-white/50 rounded-tr-lg"></div>
                        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-white/50 rounded-bl-lg"></div>
                        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-white/50 rounded-br-lg"></div>
                        <div className="scan-overlay h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                    </div>
                )}

                {isScanning && cameras.length > 1 && (
                    <button
                        onClick={handleSwitchCamera}
                        className="absolute top-4 right-4 z-30 bg-black/40 backdrop-blur-md border border-white/20 text-white p-2 rounded-full active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                )}

                {isScanning && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white/90 text-[10px] font-bold tracking-wider shadow-lg animate-pulse uppercase">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                            Scanning Active
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full">
                {isProcessing && !scanResult && (
                    <div className="w-full animate-pulse mb-4">
                        <div className="glass-card rounded-2xl p-6 shadow-xl flex flex-col items-center text-center border border-primary/30">
                            <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mb-3"></div>
                            <h3 className="text-primary font-bold">{currentMsg}</h3>
                            {queueDepth > 1 && (
                                <p className="text-accent text-[10px] font-bold uppercase mt-1">Queue Position: {queueDepth}</p>
                            )}
                            <p className="text-slate-500 text-xs mt-1 italic">Please hold for a moment</p>
                        </div>
                    </div>
                )}

                {scanResult && (
                    <div className="w-full animate-fade-in-up mb-4">
                        <div className="glass-card rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-lg font-bold text-green-400 leading-tight mb-1 drop-shadow-sm">{scanResult.message}</h3>
                            {scanResult.student && (
                                <div className="mt-3 w-full bg-black/40 rounded-xl p-3 border border-white/5">
                                    <div className="text-xl font-bold text-white tracking-wide">{scanResult.student.name}</div>
                                    <div className="text-sm font-mono text-slate-400 mt-1">{scanResult.student.rollNo}</div>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className="text-xs text-primary/80 uppercase tracking-wider font-bold">{scanResult.student.branch}</span>
                                        {scanResult.student.section && (
                                            <>
                                                <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                <span className="text-xs text-accent/80 uppercase tracking-wider font-bold">SEC: {scanResult.student.section}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="mt-2 text-xs text-slate-500">Scanned at {scanResult.timestamp}</div>
                        </div>
                    </div>
                )}
            </div>

            {scanError && (
                <div className="w-full animate-fade-in-up mb-4">
                    <div className="glass-card rounded-2xl p-5 shadow-lg flex flex-col items-center text-center bg-slate-900/50 border border-white/10">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-3 border border-amber-500/20">
                            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-200 leading-tight mb-2">Coordinator Note</h3>
                        <p className="text-slate-400 font-medium text-sm px-3 py-2 rounded-lg break-normal">{scanError}</p>
                        <div className="mt-2 text-xs text-slate-500 animate-pulse">Try scanning again</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Scanner;
