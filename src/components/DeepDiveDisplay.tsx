'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

//  Section definitions 
const REPORT_SECTIONS = [
  { title: 'Origin Context', key: 'originContext' },
  { title: 'Your Tolerations Mapped', key: 'tolerationsMapped' },
  { title: 'First House Pattern Map', key: 'firstHousePatternMap' },
  { title: 'Memory Theme Analysis', key: 'memoryThemeAnalysis' },
  { title: 'Archetype Analysis', key: 'archetypeAnalysis' },
  { title: 'Full Invisible Rule Hypothesis', key: 'fullBopHypothesis' },
  { title: 'Payoff & Cost Analysis', key: 'payoffAndCost' },
  { title: 'Observation Findings', key: 'observationFindings' },
  { title: 'Neurological Shift Framework', key: 'neurologicalShift' },
  { title: 'Your New Operating Principle', key: 'newOperatingPrinciple' },
  { title: 'Your 30-Day Counter-Strategy', key: 'thirtyDayPlan' },
  { title: 'Integration & Identity', key: 'integrationAndIdentity' },
];

//  Types 
interface Slide {
  slide: number;
  label: string;
  headline: string;
  body: string;
  type: 'cover' | 'rule' | 'insight' | 'closing';
}

interface Props {
  report: Record<string, string>;
  firstName?: string;
}

//  Slide visual configs 
const SLIDE_STYLES: Record<string, { bg: string; border: string; labelColor: string; headlineColor: string }> = {
  cover: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(180,83,9,0.08))',
    border: 'rgba(245,158,11,0.3)',
    labelColor: '#f59e0b',
    headlineColor: '#ffffff',
  },
  rule: {
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))',
    border: 'rgba(245,158,11,0.25)',
    labelColor: '#fbbf24',
    headlineColor: '#fef3c7',
  },
  insight: {
    bg: 'rgba(15, 23, 42, 0.7)',
    border: 'rgba(51, 65, 85, 0.8)',
    labelColor: '#94a3b8',
    headlineColor: '#e2e8f0',
  },
  closing: {
    bg: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
    border: 'rgba(245,158,11,0.2)',
    labelColor: '#f59e0b',
    headlineColor: '#ffffff',
  },
};

//  Main Component 
export default function DeepDiveDisplay({ report, firstName }: Props) {
  const name = firstName || 'You';
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const [activeTab, setActiveTab] = useState<'report' | 'watch' | 'listen' | 'slides'>('report');

  // Audio state
  const [audioState, setAudioState] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Video state
  const [videoState, setVideoState] = useState<'idle' | 'generating' | 'rendering' | 'ready' | 'error'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slides state
  const [slidesState, setSlidesState] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Share link state
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');

  const bopStatement = report.bopStatement || report.fullBopHypothesis || '';

  //  Share URL generation 
  const generateShareUrl = () => {
    const profile = {
      firstName: firstName || '',
      invisibleRule: bopStatement,
      fullBopHypothesis: report.fullBopHypothesis || '',
      evolvedPrinciple: report.evolvedPrinciple || report.newOperatingPrinciple || '',
      newOperatingPrinciple: report.newOperatingPrinciple || '',
      costToday: report.costToday || '',
      date: new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(profile))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `${window.location.origin}/share?d=${encoded}`;
  };

  const handleCopyShareLink = async () => {
    const url = generateShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      // Fallback: open the URL in a new tab
      window.open(url, '_blank');
    }
  };

  //  Video generation 
  const generateVideo = async () => {
    setVideoState('generating');
    setVideoError(null);
    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, firstName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      const { renderId } = await res.json();
      setVideoState('rendering');
      pollVideoStatus(renderId);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Video generation failed');
      setVideoState('error');
    }
  };

  const pollVideoStatus = (renderId: string) => {
    if (videoPollerRef.current) clearInterval(videoPollerRef.current);
    videoPollerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/video-status/${renderId}`);
        const data = await res.json();
        if (data.status === 'succeeded' && data.url) {
          clearInterval(videoPollerRef.current!);
          setVideoUrl(data.url);
          setVideoState('ready');
        } else if (data.status === 'failed') {
          clearInterval(videoPollerRef.current!);
          setVideoError(data.errorMessage || 'Render failed');
          setVideoState('error');
        }
      } catch {
        // keep polling on transient errors
      }
    }, 5000);
  };

  // Clean up poller on unmount
  useEffect(() => {
    return () => { if (videoPollerRef.current) clearInterval(videoPollerRef.current); };
  }, []);

  //  Audio generation 
  const generateAudio = async () => {
    setAudioState('generating');
    setAudioError(null);
    try {
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, firstName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Failed: ${res.status}`);
      }
      const buffer = await res.arrayBuffer();
      const blob = new Blob([buffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setDownloadUrl(url);
      setAudioState('ready');
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Audio generation failed');
      setAudioState('error');
    }
  };

  //  Slides generation 
  const generateSlides = async () => {
    setSlidesState('generating');
    try {
      const res = await fetch('/api/generate-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, firstName }),
      });
      if (!res.ok) throw new Error('Failed to generate slides');
      const json = await res.json();
      setSlides(json.slides || []);
      setSlidesState('ready');
    } catch {
      setSlidesState('error');
    }
  };

  // Auto-trigger generation when tab is selected
  useEffect(() => {
    if (activeTab === 'watch' && videoState === 'idle') generateVideo();
    if (activeTab === 'listen' && audioState === 'idle') generateAudio();
    if (activeTab === 'slides' && slidesState === 'idle') generateSlides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);
  // Fallback: estimate podcast duration from Content-Length if onLoadedMetadata gives 0 or Infinity
  useEffect(() => {
    if (!audioUrl || duration > 5) return;
    const timer = setTimeout(async () => {
      if (duration > 5) return;
      try {
        const head = await fetch(audioUrl, { method: 'HEAD', mode: 'cors' });
        const cl = parseInt(head.headers.get('content-length') || '0');
        if (cl > 0) {
          // Estimate duration: file bytes * 8 bits / 128000 bits-per-second (128kbps MP3)
          const estimated = (cl * 8) / 128000;
          if (estimated > 10) setDuration(Math.round(estimated));
        }
      } catch { /* ignore CORS errors */ }
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);


  // Audio player controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleDownload = async () => {
    if (isMobile && typeof navigator.share === 'function' && downloadUrl) {
      try {
        const blob = await fetch(downloadUrl).then(r => r.blob());
        const file = new File([blob], 'invisible-rule-deep-dive.mp3', { type: 'audio/mpeg' });
        await navigator.share({ files: [file], title: 'My Deep Dive Audio Report' });
        return;
      } catch { /* fall through */ }
    }
    if (downloadUrl) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'invisible-rule-deep-dive.mp3';
      a.click();
    }
  };

  const handlePrintReport = () => {
    // Open a print-friendly view in a new window for clean PDF export
    const printContent = document.getElementById('deep-dive-report-content');
    if (!printContent) { window.print(); return; }
    
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { window.print(); return; }
    
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invisible Rule Deep Dive &mdash; ${firstName || 'Report'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; max-width: 800px; margin: 0 auto; }
    h1, h2, h3 { color: #1a1a2e; margin-bottom: 12px; margin-top: 24px; }
    p { line-height: 1.7; margin-bottom: 12px; color: #333; }
    .section { background: #f8f8fc; border-left: 4px solid #d4a017; padding: 16px 20px; margin: 16px 0; border-radius: 4px; }
    .label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #888; margin-bottom: 6px; }
    .value { font-size: 15px; color: #1a1a2e; line-height: 1.6; }
    .header { text-align: center; padding: 24px 0 32px; border-bottom: 2px solid #d4a017; margin-bottom: 32px; }
    .header h1 { font-size: 28px; color: #1a1a2e; }
    .header p { color: #666; font-size: 14px; margin-top: 8px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>The Invisible Rule</h1>
    <p>Deep Dive Report &mdash; ${firstName || ''} &mdash; ${new Date().toLocaleDateString()}</p>
  </div>
  ${printContent.innerHTML}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  //  Render 
  return (
    <div className="min-h-screen bg-slate-950 print:bg-white pb-20 print:pb-0">

      {/*  Header  */}
      <div className="text-center px-4 pt-12 pb-8 print:pt-6 print:pb-4">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center print:border-2 print:border-amber-400"
          style={{
            background: 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706)',
            boxShadow: '0 0 56px rgba(245,158,11,0.3)',
          }}
        >
          <span className="text-slate-900 font-bold text-lg">IR</span>
        </div>
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2 print:text-amber-700">
          The Deep Dive
        </p>
        <h1 className="text-3xl font-light text-white mb-2 tracking-tight print:text-slate-900">
          {firstName ? `${name}, here is your full picture.` : 'Your Complete Invisible Rule Report'}
        </h1>
        <p className="text-slate-500 text-sm print:text-slate-600">
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}12-section analysis &middot; personalized audio &middot; slide deck
        </p>
      </div>

      {/*  Invisible Rule hero  */}
      {bopStatement && (
        <div className="max-w-3xl mx-auto px-4 mb-8 print:mb-4">
          <div
            className="rounded-2xl p-8 text-center print:border print:border-amber-300 print:bg-amber-50"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.09), rgba(180,83,9,0.06))',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4 print:text-amber-700">
              Your Invisible Rule
            </p>
            <p className="text-white text-lg leading-relaxed italic print:text-slate-900">
              &ldquo;{bopStatement}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/*  Tabs  */}
      <div className="max-w-3xl mx-auto px-4 print:hidden">
        <div
          className="flex rounded-2xl p-1 mb-8"
          style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.6)' }}
        >
          {[
            { id: 'report', label: 'Your Report', icon: '' },
            { id: 'watch', label: 'Watch', icon: '' },
            { id: 'listen', label: 'Listen', icon: '' },
            { id: 'slides', label: 'Slide Deck', icon: '' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-slate-900'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              style={activeTab === tab.id ? {
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              } : {}}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 
          TAB: REPORT
       */}
      {(activeTab === 'report' || typeof window === 'undefined') && (
        <div className="max-w-3xl mx-auto px-4 pb-16 print:px-0">
          <div className="space-y-5 print:space-y-4">
            {REPORT_SECTIONS.map((section, i) => {
              const content = report[section.key];
              if (!content) return null;
              return (
                <div
                  key={section.key}
                  className="rounded-2xl p-8 print:border print:border-slate-200 print:bg-white print:p-5"
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'rgba(245,158,11,0.15)',
                        color: '#f59e0b',
                        fontSize: '10px',
                      }}
                    >
                      {i + 1}
                    </span>
                    <h2 className="text-amber-400 text-xs font-semibold uppercase tracking-widest print:text-amber-700">
                      {section.title}
                    </h2>
                  </div>
                  <div className="text-slate-300 leading-relaxed text-[15px] print:text-slate-800 space-y-3">
                    {content.split('\n').filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion note */}
          <div
            className="mt-10 rounded-2xl p-8 text-center print:hidden"
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(51,65,85,0.5)',
            }}
          >
            <p className="text-slate-300 font-medium mb-1">You have the full picture.</p>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              This is everything &mdash; your origin, your pattern, your 30-day path.
              Use the tabs above to listen to your audio report and view your slide deck.
            </p>
          </div>

          {/* Action bar */}
          <div className="grid grid-cols-2 gap-3 mt-8 print:hidden">
            <button
              onClick={handlePrintReport}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={handleCopyShareLink}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
              style={{
                background: shareState === 'copied'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#0f172a',
                boxShadow: '0 4px 20px rgba(245,158,11,0.2)',
              }}
            >
              {shareState === 'copied' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Link Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share My Profile
                </>
              )}
            </button>
          </div>
          <div className="mt-3 print:hidden">
            <Link
              href="/"
              className="w-full flex items-center justify-center py-3.5 rounded-xl font-medium text-slate-400 hover:text-slate-300 text-sm transition-colors"
              style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}
            >
              Start a New Session
            </Link>
          </div>
        </div>
      )}

      {/* 
          TAB: WATCH
       */}
      {activeTab === 'watch' && (
        <div className="max-w-3xl mx-auto px-4 pb-16">

          {/* Generating &mdash; script + audio */}
          {videoState === 'generating' && (
            <div className="rounded-2xl p-12 text-center"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.8)' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-white text-lg font-light mb-2">Writing your narration</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Pamela is recording your personalized video. Preparing the script and voice now.
              </p>
            </div>
          )}

          {/* Rendering &mdash; Creatomate compositing */}
          {videoState === 'rendering' && (
            <div className="rounded-2xl p-12 text-center"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.8)' }}>
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white text-lg font-light mb-2">Rendering your video</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Your personalized Deep Dive video is being assembled. This usually takes 10 to 15 minutes.
              </p>
              <div className="flex justify-center gap-1.5 mt-6">
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} className="w-1.5 rounded-full bg-amber-500/60 animate-pulse"
                    style={{ height: `${12 + (i % 3) * 6}px`, animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {videoState === 'error' && (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(127,29,29,0.5)' }}>
              <p className="text-red-400 font-medium mb-2">Video generation failed</p>
              <p className="text-slate-500 text-sm mb-4">{videoError}</p>
              <button onClick={generateVideo}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-80"
                style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}>
                Try Again
              </button>
            </div>
          )}

          {/* Ready &mdash; video player */}
          {videoState === 'ready' && videoUrl && (
            <div>
              <div className="rounded-2xl overflow-hidden mb-4"
                style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full"
                  style={{ display: 'block', background: '#0f172a' }}
                />
              </div>
              <a
                href={videoUrl}
                download="invisible-rule-deep-dive.mp4"
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-white transition-all hover:opacity-90"
                style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
            </div>
          )}
        </div>
      )}

      {/* 
          TAB: LISTEN
       */}
      {activeTab === 'listen' && (
        <div className="max-w-2xl mx-auto px-4 pb-16">

          {/* Generating state */}
          {audioState === 'generating' && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                background: 'rgba(15,23,42,0.7)',
                border: '1px solid rgba(51,65,85,0.8)',
              }}
            >
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
              <h3 className="text-white text-lg font-light mb-2">Creating your audio report</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Pamela and Brian are recording your personalized episode. This takes about 30&ndash;60 seconds.
              </p>
              <div className="flex justify-center gap-1.5 mt-6">
                {[0, 1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-amber-500/60 animate-pulse"
                    style={{ height: `${12 + Math.random() * 16}px`, animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {audioState === 'error' && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(127,29,29,0.5)' }}
            >
              <p className="text-red-400 font-medium mb-2">Audio generation failed</p>
              <p className="text-slate-500 text-sm mb-4">{audioError}</p>
              <button
                onClick={generateAudio}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-80"
                style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Ready state &mdash; audio player */}
          {audioState === 'ready' && audioUrl && (
            <div>
              {/* Player card */}
              <div
                className="rounded-2xl p-8 mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(180,83,9,0.05))',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}
              >
                {/* Track info */}
                <div className="flex items-center gap-4 mb-8">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #d97706)' }}
                  >
                    <span className="text-slate-900 font-bold text-sm">IR</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">The Deep Dive &mdash; Your Episode</p>
                    <p className="text-slate-400 text-sm">
                      Hosted by Pamela &amp; Brian &middot; Prepared for {name}
                    </p>
                  </div>
                </div>

                {/* Waveform visual (decorative) */}
                <div className="flex items-center justify-center gap-0.5 h-10 mb-6">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${isPlaying ? 'animate-pulse' : ''}`}
                      style={{
                        height: `${20 + Math.sin(i * 0.4) * 12 + Math.random() * 8}px`,
                        background: isPlaying
                          ? `rgba(245,158,11,${0.4 + Math.sin(i * 0.3) * 0.3})`
                          : 'rgba(100,116,139,0.4)',
                        animationDelay: `${i * 0.02}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Seek bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #f59e0b ${duration ? (currentTime / duration) * 100 : 0}%, rgba(51,65,85,0.8) ${duration ? (currentTime / duration) * 100 : 0}%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-slate-500 text-xs font-mono">{formatTime(currentTime)}</span>
                    <span className="text-slate-500 text-xs font-mono">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => { if (audioRef.current) { audioRef.current.currentTime = Math.max(0, currentTime - 15); } }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                    </svg>
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
                    }}
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={() => { if (audioRef.current) { audioRef.current.currentTime = Math.min(duration, currentTime + 15); } }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {isMobile ? 'Share Audio Report' : 'Download MP3'}
              </button>

              {/* Hidden audio element */}
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                preload="metadata"
                onLoadedMetadata={() => { const d = audioRef.current?.duration; if (d && isFinite(d)) setDuration(d); }}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* 
          TAB: SLIDES
       */}
      {activeTab === 'slides' && (
        <div className="max-w-2xl mx-auto px-4 pb-16">

          {/* Generating */}
          {slidesState === 'generating' && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.8)' }}
            >
              <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white mb-1">Building your slide deck</p>
              <p className="text-slate-500 text-sm">Just a moment...</p>
            </div>
          )}

          {/* Error */}
          {slidesState === 'error' && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(127,29,29,0.5)' }}
            >
              <p className="text-red-400 font-medium mb-3">Could not generate slides</p>
              <button
                onClick={generateSlides}
                className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Slides ready */}
          {slidesState === 'ready' && slides.length > 0 && (
            <div>
              {/* Slide card */}
              {(() => {
                const slide = slides[currentSlide];
                const style = SLIDE_STYLES[slide.type] || SLIDE_STYLES.insight;
                return (
                  <div
                    className="rounded-2xl p-10 mb-6 min-h-72 flex flex-col justify-between"
                    style={{
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <p
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: style.labelColor }}
                        >
                          {slide.label}
                        </p>
                        <p className="text-slate-600 text-xs">
                          {currentSlide + 1} / {slides.length}
                        </p>
                      </div>
                      <h2
                        className="text-2xl font-light leading-snug mb-5"
                        style={{ color: style.headlineColor }}
                      >
                        {slide.headline}
                      </h2>
                      <p className="text-slate-400 leading-relaxed text-[15px]">
                        {slide.body}
                      </p>
                    </div>

                    {/* Slide number indicator */}
                    <div className="flex gap-1.5 mt-8">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentSlide(i)}
                          className="h-1 rounded-full transition-all"
                          style={{
                            width: i === currentSlide ? '24px' : '8px',
                            background: i === currentSlide
                              ? '#f59e0b'
                              : 'rgba(100,116,139,0.4)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentSlide(i => Math.max(0, i - 1))}
                  disabled={currentSlide === 0}
                  className="flex-1 py-3.5 rounded-xl font-medium text-sm transition-all disabled:opacity-30 hover:opacity-80"
                  style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)', color: '#e2e8f0' }}
                >
                  &larr; Previous
                </button>
                <button
                  onClick={() => setCurrentSlide(i => Math.min(slides.length - 1, i + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-95"
                  style={{
                    background: currentSlide < slides.length - 1
                      ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                      : 'rgba(30,41,59,0.6)',
                    border: '1px solid rgba(51,65,85,0.5)',
                    color: currentSlide < slides.length - 1 ? '#0f172a' : '#64748b',
                  }}
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 print:hidden" style={{ background: 'rgba(15,23,42,0.95)', borderTop: '1px solid rgba(51,65,85,0.6)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 grid grid-cols-2 gap-3">
          <button
            onClick={handlePrintReport}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.8)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PDF
          </button>
          <button
            onClick={handleCopyShareLink}
            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all"
            style={{ background: shareState === 'copied' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#0f172a', boxShadow: '0 4px 20px rgba(245,158,11,0.2)' }}
          >
            {shareState === 'copied' ? '\u2713 Link Copied!' : '\u29c6 Share My Profile'}
          </button>
        </div>
      </div>
            {/*  Footer  */}
      <div className="text-center pb-10 print:pb-4 print:mt-6">
        <p className="text-slate-700 text-xs print:text-slate-500">
          &copy; {new Date().getFullYear()} The Invisible Rule &middot; The pattern you uncovered is real &mdash; and it&apos;s yours.
        </p>
      </div>
    </div>
  );
}
