import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { getAttendance } from '../services/api';

const QRGenerator = () => {
    const [students, setStudents] = useState([]);
    const [selectedRoll, setSelectedRoll] = useState('');
    const [customRoll, setCustomRoll] = useState('');
    const [customName, setCustomName] = useState('');
    const [customBranch, setCustomBranch] = useState('CSE');
    const [customSection, setCustomSection] = useState('A');
    const [customSemester, setCustomSemester] = useState('Semester 6');

    const [qrDataUrl, setQrDataUrl] = useState('');
    const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);

    // Fetch registered students on load
    useEffect(() => {
        getAttendance()
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                setStudents(list);
                if (list.length > 0) {
                    setSelectedRoll(list[0].rollNo);
                    setCustomRoll(list[0].rollNo);
                    setCustomName(list[0].name);
                    setCustomBranch(list[0].branch || 'CSE');
                    setCustomSemester(list[0].semester || 'Semester 6');
                    setCustomSection(list[0].section || 'A');
                }
            })
            .catch(err => console.warn('Could not load student list for QR:', err));
    }, []);

    // Generate QR when customRoll changes
    useEffect(() => {
        const textToEncode = (customRoll || '').trim();
        if (!textToEncode) {
            setQrDataUrl('');
            return;
        }

        QRCode.toDataURL(textToEncode, {
            width: 320,
            margin: 2,
            color: {
                dark: '#030712',
                light: '#ffffff'
            }
        })
            .then(url => setQrDataUrl(url))
            .catch(err => console.error('QR generation error:', err));
    }, [customRoll]);

    const handleSelectStudent = (e) => {
        const roll = e.target.value;
        setSelectedRoll(roll);
        const st = students.find(s => s.rollNo === roll);
        if (st) {
            setCustomRoll(st.rollNo);
            setCustomName(st.name);
            setCustomBranch(st.branch || 'CSE');
            setCustomSemester(st.semester || 'Semester 6');
            setCustomSection(st.section || 'A');
        }
    };

    const downloadSinglePNG = () => {
        if (!qrDataUrl) return;
        const link = document.createElement('a');
        link.download = `${customRoll || 'student'}_QR.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const downloadBatchPDF = async () => {
        if (!students.length) return;
        setIsGeneratingBatch(true);
        setBatchProgress(0);

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = 210;
            const pageHeight = 297;
            const cardWidth = 85;
            const cardHeight = 55;
            const startX = 15;
            const startY = 15;
            const gapX = 10;
            const gapY = 10;

            const cardsPerRow = 2;
            const cardsPerCol = 4;
            const cardsPerPage = cardsPerRow * cardsPerCol;

            for (let i = 0; i < students.length; i++) {
                const s = students[i];
                const pageIndex = Math.floor(i / cardsPerPage);
                const posInPage = i % cardsPerPage;

                if (posInPage === 0 && pageIndex > 0) {
                    doc.addPage();
                }

                const col = posInPage % cardsPerRow;
                const row = Math.floor(posInPage / cardsPerRow);

                const x = startX + col * (cardWidth + gapX);
                const y = startY + row * (cardHeight + gapY);

                // Card Border & Background
                doc.setDrawColor(200, 200, 210);
                doc.setFillColor(250, 250, 255);
                doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

                // Header Banner
                doc.setFillColor(79, 70, 229); // Indigo/Purple
                doc.roundedRect(x, y, cardWidth, 10, 3, 3, 'F');
                doc.rect(x, y + 6, cardWidth, 4, 'F'); // Square bottom of header
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('SMART ATTENDANCE PASS', x + cardWidth / 2, y + 6.5, { align: 'center' });

                // Student Details
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(s.name.slice(0, 20), x + 5, y + 17);

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(`Roll: ${s.rollNo}`, x + 5, y + 23);
                doc.text(`Branch: ${s.branch || 'CSE'}`, x + 5, y + 28);
                doc.text(`Sec: ${s.section || 'A'} | ${s.semester || 'Sem 6'}`, x + 5, y + 33);

                // QR Code
                const qrImage = await QRCode.toDataURL(s.rollNo, { margin: 1 });
                doc.addImage(qrImage, 'PNG', x + cardWidth - 28, y + 13, 23, 23);

                // Footer micro text
                doc.setFontSize(6);
                doc.setTextColor(148, 163, 184);
                doc.text('Scan for instant check-in', x + 5, y + cardHeight - 4);

                setBatchProgress(Math.round(((i + 1) / students.length) * 100));
            }

            doc.save('Student_Attendance_Badges.pdf');
        } catch (err) {
            console.error('Batch PDF generation failed:', err);
            alert('Failed to generate batch badges: ' + err.message);
        } finally {
            setIsGeneratingBatch(false);
            setBatchProgress(0);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 animate-fade-in-up">
            {/* Top Info Banner */}
            <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                    Identity Pass & QR Badges
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">QR Code Generator</h2>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                    Generate individual high-resolution QR codes or download printable batch badge cards for students.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Left: Input & Select Controls */}
                <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-5">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        Student Details
                    </h3>

                    {/* Pre-fill from existing students */}
                    {students.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                Choose From Registered Students ({students.length})
                            </label>
                            <select
                                value={selectedRoll}
                                onChange={handleSelectStudent}
                                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-cyan-500 cursor-pointer"
                            >
                                {students.map(s => (
                                    <option key={s.rollNo} value={s.rollNo}>
                                        {s.rollNo} &bull; {s.name} ({s.branch || 'CSE'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="h-px bg-white/10 my-1"></div>

                    {/* Manual inputs */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Roll Number / QR Payload *</label>
                        <input
                            type="text"
                            value={customRoll}
                            onChange={(e) => setCustomRoll(e.target.value.toUpperCase())}
                            placeholder="e.g. 21B01A0501"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white font-mono text-base focus:border-cyan-500 transition"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Student Name</label>
                        <input
                            type="text"
                            value={customName}
                            onChange={(e) => setCustomName(e.target.value)}
                            placeholder="e.g. Pavan Narasimha"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-white/10 text-white text-sm focus:border-cyan-500 transition"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Branch</label>
                            <input
                                type="text"
                                value={customBranch}
                                onChange={(e) => setCustomBranch(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-xs"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Section</label>
                            <input
                                type="text"
                                value={customSection}
                                onChange={(e) => setCustomSection(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white text-xs"
                            />
                        </div>
                    </div>

                    {/* Batch Action */}
                    <div className="pt-2">
                        <button
                            onClick={downloadBatchPDF}
                            disabled={isGeneratingBatch || !students.length}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 active:scale-98 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                            {isGeneratingBatch ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Building Badges PDF ({batchProgress}%)...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print All Badges PDF ({students.length} Students)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Badge & QR Preview */}
                <div className="flex flex-col items-center gap-5">
                    {/* Live Preview Card */}
                    <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-3xl border border-white/15 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-primary to-purple-500"></div>

                        {/* Department Badge Tag */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                CSE Department Attendance Pass
                            </span>
                        </div>

                        {/* High-Res QR Canvas */}
                        <div className="p-3 bg-white rounded-2xl shadow-xl mb-4 border border-slate-200">
                            {qrDataUrl ? (
                                <img
                                    src={qrDataUrl}
                                    alt={`QR for ${customRoll}`}
                                    className="w-48 h-48 rounded-lg object-contain"
                                />
                            ) : (
                                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                                    Enter Roll Number
                                </div>
                            )}
                        </div>

                        {/* Student Details in Badge */}
                        <h4 className="text-xl font-black text-white tracking-wide">
                            {customName || 'Student Name'}
                        </h4>
                        <p className="font-mono text-cyan-400 font-bold text-base mt-0.5">
                            {customRoll || 'ROLL NUMBER'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            <span>{customBranch || 'CSE'}</span>
                            <span>&bull;</span>
                            <span>Sec {customSection || 'A'}</span>
                            <span>&bull;</span>
                            <span>{customSemester || 'Sem 6'}</span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/10 w-full flex items-center justify-between text-[10px] text-slate-500">
                            <span>Official Event Pass</span>
                            <span className="text-green-400 font-bold">&check; Validated</span>
                        </div>
                    </div>

                    {/* Download Single QR Button */}
                    <button
                        onClick={downloadSinglePNG}
                        disabled={!qrDataUrl}
                        className="cursor-pointer w-full max-w-sm py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-cyan-500/25 active:scale-98 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download QR Image (PNG)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QRGenerator;
