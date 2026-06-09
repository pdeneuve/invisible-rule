'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Vapi from '@vapi-ai/web';
import { v4 as uuidv4 } from 'uuid';
import VoiceOrb from './VoiceOrb';
import SafetyModal from './SafetyModal';
import PricingScreen from './PricingScreen';

type CallState = 'idle' | 'connecting' | 'active' | 'ai-speaking' | 'user-speaking' | 'ended';

interface TranscriptEntry {
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
}

const PHASE_LABELS = [
    'Getting Started',
    'Mapping Tolerations',
    'Finding the Pattern',
    'Your Strengths',
    'Origin Story',
    'Coding the Pattern',
    'Your Invisible Rule',
    'Observation Period',
    '30-Day Strategy',
];

export default function VoiceInterface() {
    const [callState, setCallState] = useState<CallState>('idle');
    const [hasStarted, setHasStarted] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [showPricing, setShowPricing] = useState(false);
    const [showSafety, setShowSafety] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    // sessionId is regenerated for each new call so the same tab can run multiple
    // sessions back-to-back without state bleed.
    const [sessionId, setSessionId] = useState(() => uuidv4());
    const [callDuration, setCallDuration] = useState(0);
    const [showTranscript, setShowTranscript] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [connectionTimedOut, setConnectionTimedOut] = useState(false);

    // Captured during the session (mid-conversation modal), not persisted across visits
    const [capturedFirstName, setCapturedFirstName] = useState('');
    const [capturedEmail, setCapturedEmail] = useState('');
    const [showCaptureModal, setShowCaptureModal] = useState(false);
    const [earlyName, setEarlyName] = useState('');
    const [earlyEmail, setEarlyEmail] = useState('');
    const [earlyError, setEarlyError] = useState('');
    const [earlySubmitting, setEarlySubmitting] = useState(false);

    const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);
    const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const callStartTimeRef = useRef<number | null>(null);
    const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Submit-lock so fulfillment never runs more than once per session
    const hasSubmittedRef = useRef(false);
    // Count of user turns; triggers the mid-session capture modal at threshold
    const userMessageCountRef = useRef(0);
    // Mute state we restore after the capture modal closes; the mic should pause
    // while the user is typing into the form so their typing doesn't pollute
    // the conversation transcript.
    const mutedForCaptureRef = useRef(false);
    // Fresh-value refs for state that the long-lived vapi.on('message') closure
    // needs to read. State variables in the closure would go stale because the
    // listener is registered once at startCall and never re-bound.
    const capturedEmailRef = useRef('');
    const isMutedRef = useRef(false);
    const CAPTURE_AFTER_USER_MESSAGES = 3;

    useEffect(() => { capturedEmailRef.current = capturedEmail; }, [capturedEmail]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    // Stricter email check than the obviously-permissive default; we accept
    // a single label TLD (e.g. example.local) so common dev addresses still pass.
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

    useEffect(() => {
        if (transcriptRef.current) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [transcript]);

    // Warn the user before they navigate away during an active voice session.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const callInProgress = callState !== 'idle' && callState !== 'ended';
        if (!callInProgress) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Chrome ignores the returnValue text but requires it to be set
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [callState]);

    useEffect(() => {
        if (callState === 'active' || callState === 'ai-speaking' || callState === 'user-speaking') {
            if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
            durationRef.current = setInterval(() => {
                setCallDuration(Math.floor((Date.now() - (callStartTimeRef.current || Date.now())) / 1000));
            }, 1000);
        } else {
            if (durationRef.current) clearInterval(durationRef.current);
        }
        return () => {
            if (durationRef.current) clearInterval(durationRef.current);
        };
    }, [callState]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const detectPhase = useCallback((text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('tolerating') || lower.includes('toleration') || lower.includes('putting up with')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 1));
        } else if (lower.includes('repeating') || lower.includes('pattern across') || lower.includes('theme')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 2));
        } else if (lower.includes('survived') || lower.includes('overcome') || lower.includes('what you had to become')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 3));
        } else if (lower.includes('first house') || lower.includes('growing up') || lower.includes('childhood') || lower.includes('emotional climate')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 4));
        } else if (lower.includes('survival signal') || lower.includes('five elements') || lower.includes('threat theme')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 5));
        } else if (lower.includes('invisible rule') || lower.includes('when i detect') || lower.includes('how much does this land')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 6));
        } else if (lower.includes('observation') || lower.includes('7 to 10 days') || lower.includes('notice the pattern')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 7));
        } else if (lower.includes('counter-strategy') || lower.includes('30-day') || lower.includes('micro-action')) {
            setCurrentPhaseIndex(prev => Math.max(prev, 8));
        }
    }, []);

    const checkDistress = useCallback((text: string) => {
        const distressPatterns = [
            /\b(8|9|10)\s*(?:out of|\/)\s*10/i,
            /i(?:'m| am) (overwhelmed|in crisis|not okay|falling apart|can't breathe)/i,
            /can(?:'t| not) (?:breathe|stop crying|do this)/i,
        ];
        if (distressPatterns.some(p => p.test(text))) {
            setShowSafety(true);
        }
    }, []);

    const handleLeadSubmit = useCallback(async (firstName: string, email: string, tier: 1 | 2 | 3 | null) => {
        // Prevent duplicate submissions
        if (hasSubmittedRef.current) return;
        hasSubmittedRef.current = true;

        const reportTier: 1 | 2 = tier === 1 ? 1 : 2;
        const transcriptText = transcript
            .map(t => `${t.role === 'user' ? 'USER' : 'GUIDE'}: ${t.text}`)
            .join('\n\n');

        const leadData = {
            firstName,
            email,
            sessionId,
            sessionTranscript: transcriptText,
            workingHypothesis: '',
            confirmedHypothesis: '',
            detectedArchetype: 'Pending voice analysis',
            tolerations: [],
            patternData: {
                threatThemes: [],
                emotionalSignals: [],
                adaptationMoves: [],
                protectedNeeds: [],
                coreBeliefs: [],
                memoryWeights: [],
            },
            completedAt: new Date().toISOString(),
        };

        // Tag as session-completed (stops the abandoned-visitor drip)
        try {
            await fetch('/api/submit-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...leadData, tags: ['session-completed'] }),
            });
        } catch (err) { console.warn('submit-lead failed:', err); }

        const sessionStateForReport = {
            phase: 'REPORT' as const,
            phaseProgress: 100,
            overallProgress: 100,
            messages: transcript.map(t => ({
                id: uuidv4(),
                role: t.role,
                content: t.text,
                timestamp: t.timestamp,
            })),
            tolerations: [],
            repeatingThemes: [],
            firstHouseMemories: [],
            patternData: leadData.patternData,
            workingHypothesis: '',
            confirmedHypothesis: '',
            detectedArchetype: null,
            confidenceScore: 0,
            observationLogs: [],
            leadCaptured: true,
            leadData,
            safetyTriggered: false,
            sessionId,
        };

        let report: Record<string, string> | null = null;
        try {
            const reportRes = await fetch('/api/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionState: sessionStateForReport, tier: reportTier }),
            });
            if (!reportRes.ok) throw new Error(`Report generation failed: ${reportRes.status}`);
            const json = await reportRes.json();
            report = json.report ?? null;
        } catch (err) {
            console.error('Report generation error:', err);
        }

        if (typeof window !== 'undefined') {
            // Wrap with sessionId so /report and /processing can verify the
            // data belongs to *this* session and never show stale content
            // from a previous session in the same browser.
            localStorage.setItem('bop_report_a', JSON.stringify({ sessionId, payload: report }));
            localStorage.setItem('bop_lead_data', JSON.stringify({ sessionId, payload: leadData }));
        }

        if (report) {
            const params = typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search)
                : null;
            const pendingParam = params?.get('pending');
            const testParam = params?.get('test');
            const isPending =
                pendingParam === '1' || pendingParam === '2' ||
                testParam === 'firstlight' || testParam === 'deepdive';

            // Mode informs save-session whether it should fulfill server-side or
            // just store the session and wait for the GHL webhook.
            let saveMode: 'free' | 'pending' | 'paid';
            if (isPending) saveMode = 'pending';
            else if (tier === null) saveMode = 'free';
            else saveMode = 'paid';

            try {
                const saveRes = await fetch('/api/save-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        firstName,
                        sessionId,
                        transcript: transcriptText,
                        report,
                        createdAt: new Date().toISOString(),
                        mode: saveMode,
                        tier,
                    }),
                });
                if (!saveRes.ok) {
                    console.error('save-session returned', saveRes.status);
                    hasSubmittedRef.current = false; // allow retry on error
                    setErrorMessage('We had trouble saving your session. Please try again.');
                    return;
                }
            } catch (err) {
                console.error('save-session failed:', err);
                hasSubmittedRef.current = false;
                setErrorMessage('We had trouble saving your session. Please try again.');
                return;
            }
        }

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const pendingParam = params.get('pending');
            const testParam = params.get('test');
            const isPending =
                pendingParam === '1' || pendingParam === '2' ||
                testParam === 'firstlight' || testParam === 'deepdive';

            if (tier === null) {
                window.location.href = `/report?sid=${sessionId}`;
            } else if (isPending) {
                // User already paid; show their processing/results page instead of GHL.
                window.location.href = `/processing?tier=${tier}&sid=${sessionId}`;
            } else {
                // Normal paid path: redirect to GHL checkout. If the env var is
                // missing we refuse to send the user to /processing, since that
                // would deliver the product without payment.
                const ghlUrl =
                    tier === 1 ? process.env.NEXT_PUBLIC_GHL_URL_TIER1 :
                    tier === 2 ? process.env.NEXT_PUBLIC_GHL_URL_TIER2 :
                    process.env.NEXT_PUBLIC_GHL_URL_TIER3;
                if (!ghlUrl) {
                    console.error(`NEXT_PUBLIC_GHL_URL_TIER${tier} missing — refusing fallback`);
                    setErrorMessage(
                        'Checkout is temporarily unavailable. Your session has been saved; please try again shortly.',
                    );
                    hasSubmittedRef.current = false;
                    return;
                }
                window.location.href = ghlUrl;
            }
        }
    }, [transcript, sessionId]);

    // If the user ends the call without filling the mid-session capture modal,
    // surface it now so we can still email them their report.
    useEffect(() => {
        if (callState === 'ended' && !capturedEmail) {
            setShowCaptureModal(true);
        }
    }, [callState, capturedEmail]);

    // Auto-trigger submission ONCE when voice ends - replaces the manual button
    useEffect(() => {
        if (callState !== 'ended') return;
        if (hasSubmittedRef.current) return;
        if (!capturedEmail || !capturedFirstName) return;

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const isPaid = params?.get('mode') === 'paid';
        const pendingParam = params?.get('pending');
        const pendingTier: 1 | 2 | null = pendingParam === '1' ? 1 : pendingParam === '2' ? 2 : null;
        const testParam = params?.get('test');
        const testTier: 1 | 2 | null = testParam === 'firstlight' ? 1 : testParam === 'deepdive' ? 2 : null;

        if (pendingTier) {
            // User already paid (came from a "complete your voice session" email).
            // Skip the pricing screen and use the tier they paid for.
            handleLeadSubmit(capturedFirstName, capturedEmail, pendingTier);
            return;
        }

        if (testTier) {
            // Internal test mode: only honour the test param if the server confirms
            // TEST_MODE_ENABLED=true. Otherwise silently fall back to default flow.
            (async () => {
                let testEnabled = false;
                try {
                    const res = await fetch('/api/test-mode/check');
                    if (res.ok) {
                        const data = await res.json();
                        testEnabled = data?.enabled === true;
                    }
                } catch (err) {
                    console.warn('test-mode check failed:', err);
                }

                if (testEnabled) {
                    handleLeadSubmit(capturedFirstName, capturedEmail, testTier);
                } else if (isPaid) {
                    setShowPricing(true);
                } else {
                    handleLeadSubmit(capturedFirstName, capturedEmail, null);
                }
            })();
            return;
        }

        if (isPaid) {
            setShowPricing(true);
        } else {
            handleLeadSubmit(capturedFirstName, capturedEmail, null);
        }
    }, [callState, capturedEmail, capturedFirstName, handleLeadSubmit]);

    const startCall = useCallback(async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            setErrorMessage('Microphone access is needed for the voice session. Please enable your microphone in your browser settings and try again.');
            return;
        }

        if (typeof window !== 'undefined') {
            localStorage.removeItem('bop_report_a');
            localStorage.removeItem('bop_lead_data');
            localStorage.removeItem('bop_tier');
            localStorage.removeItem('captured_email');
            localStorage.removeItem('captured_firstName');
            sessionStorage.removeItem('bop_report_a');
            sessionStorage.removeItem('bop_lead_data');
        }

        // Reset submit lock, captured contact, user-message counter, and the
        // sessionId for a truly fresh session.
        hasSubmittedRef.current = false;
        userMessageCountRef.current = 0;
        mutedForCaptureRef.current = false;
        setSessionId(uuidv4());
        setTranscript([]);
        setCurrentPhaseIndex(0);
        setCapturedFirstName('');
        setCapturedEmail('');
        setShowCaptureModal(false);
        setEarlyName('');
        setEarlyEmail('');
        setEarlyError('');

        setHasStarted(true);
        setErrorMessage(null);
        setConnectionTimedOut(false);
        setCallState('connecting');

        connectionTimeoutRef.current = setTimeout(() => {
            setConnectionTimedOut(true);
            setErrorMessage("We're having trouble connecting. Please make sure your microphone is enabled and try again.");
            setCallState('idle');
            setHasStarted(false);
            if (vapiRef.current) {
                try { vapiRef.current.stop(); } catch { /* ignore */ }
            }
        }, 15000);

        const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
        if (!publicKey) {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setErrorMessage('VAPI public key not configured. Check your environment variables.');
            setCallState('idle');
            setHasStarted(false);
            return;
        }

        const vapi = new Vapi(publicKey);
        vapiRef.current = vapi;

        vapi.on('call-start', () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setConnectionTimedOut(false);
            setCallState('active');
            callStartTimeRef.current = Date.now();
        });

        vapi.on('call-end', () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setTranscript(prev => {
                if (prev.length < 2) {
                    setErrorMessage('The voice session ended unexpectedly. Please check your microphone permissions and try again.');
                    setCallState('idle');
                    setHasStarted(false);
                    return prev;
                }
                setCallState('ended');
                return prev;
            });
        });

        vapi.on('speech-start', () => setCallState('ai-speaking'));
        vapi.on('speech-end', () => { setCallState('active'); setVolumeLevel(0); });
        vapi.on('volume-level', (level: number) => setVolumeLevel(level));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vapi.on('message', (message: any) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const role = message.role as 'user' | 'assistant';
                const text = (message.transcript as string) || '';
                setTranscript(prev => [...prev, { role, text, timestamp: new Date() }]);
                if (role === 'assistant') {
                    detectPhase(text);
                }
                if (role === 'user') {
                    checkDistress(text);
                    setCallState('user-speaking');
                    setTimeout(() => setCallState('active'), 500);
                    userMessageCountRef.current += 1;
                    // Once the user is a few turns in, surface the capture modal
                    // so we can email them their report. We mute the mic while
                    // the modal is open so the user typing into the form (or
                    // talking to themselves) doesn't pollute the transcript.
                    if (
                        userMessageCountRef.current === CAPTURE_AFTER_USER_MESSAGES &&
                        !capturedEmailRef.current
                    ) {
                        if (vapiRef.current && !isMutedRef.current) {
                            try { vapiRef.current.setMuted(true); } catch { /* ignore */ }
                            mutedForCaptureRef.current = true;
                            isMutedRef.current = true;
                            setIsMuted(true);
                        }
                        setShowCaptureModal(true);
                    }
                }
            }
        });

        vapi.on('error', (error: Error) => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            console.error('VAPI error:', error);
            const msg = error?.message || JSON.stringify(error) || '';
            const isNormalEnd = msg.includes('Meeting has ended') || msg.includes('"msg":"Meeting has ended"') || msg.includes('ejected');
            if (isNormalEnd) {
                setTranscript(prev => {
                    if (prev.length < 2) {
                        setErrorMessage('The voice session could not connect. Please check your microphone permissions and internet connection, then try again.');
                        setCallState('idle');
                        setHasStarted(false);
                    } else {
                        setCallState('ended');
                    }
                    return prev;
                });
                return;
            }
            setErrorMessage('We encountered a connection error. Please try again.');
            setCallState('idle');
            setHasStarted(false);
        });

        try {
            const res = await fetch('/api/get-vapi-assistant');
            const data = await res.json();
            if (!res.ok || !data.assistantId) {
                throw new Error(data.error || data.details?.message || 'Could not get VAPI assistant ID');
            }
            await vapi.start(data.assistantId);
        } catch (err) {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            console.error('Failed to start VAPI call:', err);
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            setErrorMessage(`Failed to start call: ${msg}`);
            setCallState('idle');
            setHasStarted(false);
        }
    }, [detectPhase, checkDistress]);

    const handleBeginClick = useCallback(() => {
        // No pre-session gate: start the voice session immediately.
        // The capture modal will surface a few turns in, or at call end.
        startCall();
    }, [startCall]);

    const handleEarlyCaptureSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const fn = earlyName.trim();
        const em = earlyEmail.trim();
        if (!fn || !em) {
            setEarlyError('Please enter both your name and email.');
            return;
        }
        if (!EMAIL_RE.test(em)) {
            setEarlyError('Please enter a valid email address.');
            return;
        }
        setEarlySubmitting(true);

        setCapturedFirstName(fn);
        setCapturedEmail(em);
        setShowCaptureModal(false);

        // Restore the mic if we muted it to show the modal mid-call.
        if (mutedForCaptureRef.current && vapiRef.current && callState !== 'ended') {
            try { vapiRef.current.setMuted(false); } catch { /* ignore */ }
            isMutedRef.current = false;
            setIsMuted(false);
        }
        mutedForCaptureRef.current = false;

        const callInProgress = callState !== 'ended' && callState !== 'idle';
        try {
            await fetch('/api/submit-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: fn,
                    email: em,
                    sessionId,
                    sessionTranscript: '',
                    completedAt: new Date().toISOString(),
                    tags: [callInProgress ? 'in-session-captured' : 'session-completed'],
                }),
            });
        } catch (err) {
            console.warn('early submit-lead failed:', err);
        }

        setShowCaptureModal(false);
        setEarlySubmitting(false);
        // Voice is already running (mid-session) or already ended (post-call) —
        // do NOT call startCall here; the auto-trigger useEffect will detect
        // the now-set capturedEmail and run handleLeadSubmit if appropriate.
    }, [earlyName, earlyEmail, sessionId, callState]);

    const handleTryAgain = useCallback(() => {
        setConnectionTimedOut(false);
        setErrorMessage(null);
        setHasStarted(false);
    }, []);

    const endCall = useCallback(() => {
        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        if (vapiRef.current) {
            vapiRef.current.stop();
        }
        setCallState('ended');
    }, []);

    const toggleMute = useCallback(() => {
        if (vapiRef.current) {
            const newMuted = !isMuted;
            vapiRef.current.setMuted(newMuted);
            setIsMuted(newMuted);
        }
    }, [isMuted]);

    const overallProgress = Math.round((currentPhaseIndex / (PHASE_LABELS.length - 1)) * 100);

    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4">
                <div className="max-w-xl w-full text-center">
                    <div className="relative inline-flex items-center justify-center mb-10">
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center"
                            style={{
                                background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706, #92400e)',
                                boxShadow: '0 0 60px rgba(245, 158, 11, 0.3)',
                            }}
                        >
                            <svg className="w-10 h-10 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                    </div>

                    <h1 className="text-4xl font-light text-white mb-3 tracking-tight">The Invisible Rule</h1>
                    <p className="text-xl text-slate-400 mb-2">You keep starting over. But nothing changes.</p>
                    <p className="text-slate-500 mb-10 leading-relaxed max-w-md mx-auto">
                        A belief you have carried most of your life is still making your choices for you. And you have no idea it is there. This is your Invisible Rule.
                    </p>

                    <div className="bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-8 mb-8 text-left">
                        <h3 className="text-white font-medium mb-5 text-sm uppercase tracking-widest text-center">What to expect</h3>
                        <ul className="space-y-4">
                            {[
                                ['\uD83C\uDFA4\uFE0F', 'A guided voice conversation - one question at a time'],
                                ['\u23F1\uFE0F', '30 to 60 minutes to complete the full process'],
                                ['\uD83D\uDCC4', 'A Deep Dive Report - delivered to your email'],
                                ['\uD83D\uDD12', 'Private, confidential, and judgment-free'],
                            ].map(([icon, text]) => (
                                <li key={text} className="flex items-start gap-3 text-slate-300">
                                    <span className="text-lg leading-none mt-0.5">{icon}</span>
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {errorMessage && (
                        <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm text-left">
                            <p className="font-medium mb-1">Error</p>
                            <p>{errorMessage}</p>
                            {connectionTimedOut && (
                                <button onClick={handleTryAgain} className="mt-3 px-4 py-2 bg-red-800/50 hover:bg-red-800 border border-red-600 rounded-lg text-red-200 text-sm transition-colors">
                                    Try Again
                                </button>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleBeginClick}
                        className="w-full py-5 px-8 rounded-2xl text-slate-900 font-semibold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                        }}
                    >
                        Begin Voice Session
                    </button>
                    <p className="text-slate-600 text-xs mt-5 leading-relaxed">
                        Make sure your microphone is enabled. This is pattern-mapping work, not therapy.<br />
                        If you are in crisis, please contact a mental health professional.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: 'radial-gradient(circle, #fbbf24, #d97706)' }}
                    >
                        <span className="text-slate-900 text-xs font-bold">IR</span>
                    </div>
                    <span className="text-white/80 font-medium text-sm">The Invisible Rule</span>
                </div>
                <div className="flex items-center gap-4">
                    {callState !== 'idle' && callState !== 'connecting' && (
                        <span className="text-slate-500 text-sm font-mono">{formatDuration(callDuration)}</span>
                    )}
                    <div className="text-right">
                        <div className="text-slate-500 text-xs mb-1">{PHASE_LABELS[currentPhaseIndex]}</div>
                        <div className="w-28 bg-slate-800 rounded-full h-1">
                            <div
                                className="bg-amber-500 h-1 rounded-full transition-all duration-700"
                                style={{ width: `${overallProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                {callState !== 'ended' && <VoiceOrb state={callState} volumeLevel={volumeLevel} />}

                <div className="mt-8 text-center max-w-xl">
                    {callState === 'connecting' && <p className="text-slate-400 text-lg animate-pulse">Connecting...</p>}
                    {callState === 'active' && <p className="text-slate-500 text-base">Listening...</p>}
                    {callState === 'ai-speaking' && <p className="text-amber-400/80 text-base">Speaking</p>}
                    {callState === 'user-speaking' && <p className="text-blue-400/80 text-base">I&apos;m listening</p>}
                    {callState === 'ended' && !showPricing && (
                        <div className="text-center px-4">
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                                style={{ background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)' }}>
                                <div className="w-8 h-8 border-2 border-slate-900/60 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-light text-white mb-4 tracking-tight">
                                Your Deep Dive is being prepared...
                            </h2>
                            <p className="text-slate-300 text-lg leading-relaxed mb-3">
                                This takes about 10 minutes.
                            </p>
                            <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
                                Check your email for your full Deep Dive — report, podcast, video, and slides.
                                You can close this window. Everything will be sent to <span className="text-amber-400">{capturedEmail}</span>.
                            </p>
                        </div>
                    )}
                </div>

                {showTranscript && transcript.length > 0 && callState !== 'ended' && (
                    <div
                        ref={transcriptRef}
                        className="mt-8 w-full max-w-lg h-48 overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2"
                    >
                        {transcript.map((entry, i) => (
                            <div
                                key={i}
                                className={`text-sm ${entry.role === 'user' ? 'text-slate-300 text-right' : 'text-slate-400 text-left'}`}
                            >
                                <span className={`inline-block px-3 py-1.5 rounded-xl max-w-[85%] ${
                                    entry.role === 'user' ? 'bg-slate-700' : 'bg-slate-800'
                                }`}>
                                    {entry.text}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {callState !== 'idle' && callState !== 'ended' && (
                <div className="pb-12 flex items-center justify-center gap-6">
                    <button
                        onClick={() => setShowTranscript(v => !v)}
                        className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-colors"
                        title="Toggle transcript"
                    >
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>

                    <button
                        onClick={toggleMute}
                        className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all ${
                            isMuted ? 'bg-red-900/40 border-red-700 hover:bg-red-900/60' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? (
                            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={endCall}
                        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                        title="End session"
                    >
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
                        </svg>
                    </button>
                </div>
            )}

            {showSafety && <SafetyModal onClose={() => setShowSafety(false)} />}

            {showCaptureModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                    <div className="relative bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-8">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 11-8 0 4 4 0 018 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-light text-white mb-2">
                                {callState === 'ended' ? 'One last thing' : 'Where should we send your report?'}
                            </h2>
                            <p className="text-slate-400 leading-relaxed">
                                {callState === 'ended'
                                    ? 'Enter your name and email so we can deliver your personalized report. Your voice session has been captured.'
                                    : 'Your voice session is in progress. Drop your name and email here and your full report will be in your inbox shortly after we wrap.'}
                            </p>
                        </div>

                        <form onSubmit={handleEarlyCaptureSubmit} className="space-y-4">
                            <div>
                                <label className="block text-slate-300 text-sm mb-2">First Name</label>
                                <input
                                    type="text"
                                    value={earlyName}
                                    onChange={e => setEarlyName(e.target.value)}
                                    placeholder="Your first name"
                                    className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 text-sm mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={earlyEmail}
                                    onChange={e => setEarlyEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full bg-slate-700 text-white placeholder-slate-400 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                                />
                            </div>

                            {earlyError && <p className="text-red-400 text-sm">{earlyError}</p>}

                            <button
                                type="submit"
                                disabled={earlySubmitting}
                                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-900 font-semibold py-4 rounded-xl transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
                            >
                                {earlySubmitting ? 'Saving...' : (callState === 'ended' ? 'Deliver my report' : 'Continue session')}
                            </button>
                            <p className="text-center text-slate-500 text-xs">
                                No spam. No selling your data.
                            </p>
                        </form>

                        {callState !== 'ended' && (
                            <button
                                onClick={() => {
                                    // Restore the mic if we muted it to show the modal.
                                    if (mutedForCaptureRef.current && vapiRef.current) {
                                        try { vapiRef.current.setMuted(false); } catch { /* ignore */ }
                                        isMutedRef.current = false;
                                        setIsMuted(false);
                                    }
                                    mutedForCaptureRef.current = false;
                                    setShowCaptureModal(false);
                                }}
                                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
                                title="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {showPricing && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <PricingScreen
                        onSelectTier={(tier) => {
                            setShowPricing(false);
                            if (capturedEmail && capturedFirstName) {
                                handleLeadSubmit(capturedFirstName, capturedEmail, tier);
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}
