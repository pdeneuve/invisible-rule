'use client';

import { use, useEffect, useState } from 'react';

interface Status {
  status: 'planned' | 'rendering' | 'succeeded' | 'failed';
  url: string | null;
  errorMessage: string | null;
}

export default function VideoStatusPage({
  params,
}: {
  params: Promise<{ renderId: string }>;
}) {
  const { renderId } = use(params);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      try {
        const res = await fetch(`/api/video-status/${renderId}`);
        if (!res.ok) throw new Error(`status request failed: ${res.status}`);
        const data: Status = await res.json();
        if (cancelled) return;
        setStatus(data);
        if (data.status === 'succeeded' || data.status === 'failed') {
          if (interval) clearInterval(interval);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    check();
    interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [renderId]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-2">We could not load your video.</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status.status === 'failed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 mb-2">Video rendering failed.</p>
          <p className="text-slate-500 text-sm">{status.errorMessage || 'Please contact support.'}</p>
        </div>
      </div>
    );
  }

  if (status.status === 'succeeded' && status.url) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-light text-white mb-4 text-center">Your Deep Dive Video</h1>
          <video
            controls
            autoPlay
            className="w-full rounded-2xl shadow-lg"
            src={status.url}
          />
          <p className="text-slate-500 text-sm text-center mt-4">
            <a
              href={status.url}
              download
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Download video
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-300 mb-1">Your video is being rendered.</p>
        <p className="text-slate-500 text-sm">This usually takes 3 to 5 minutes. This page updates automatically.</p>
      </div>
    </div>
  );
}
