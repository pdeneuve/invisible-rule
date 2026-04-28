'use client';

interface Props {
  state: 'idle' | 'connecting' | 'active' | 'ai-speaking' | 'user-speaking' | 'ended';
  volumeLevel?: number;
}

export default function VoiceOrb({ state, volumeLevel = 0 }: Props) {
  const scale = state === 'ai-speaking' ? 1 + volumeLevel * 0.4 : 1;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer pulse rings */}
      {(state === 'ai-speaking' || state === 'active') && (
        <>
          <div
            className="absolute rounded-full bg-amber-500/10 animate-ping"
            style={{ width: '160px', height: '160px', animationDuration: '2s' }}
          />
          <div
            className="absolute rounded-full bg-amber-500/5 animate-ping"
            style={{ width: '192px', height: '192px', animationDuration: '2.5s', animationDelay: '0.3s' }}
          />
        </>
      )}

      {state === 'user-speaking' && (
        <>
          <div
            className="absolute rounded-full bg-blue-400/10 animate-ping"
            style={{ width: '160px', height: '160px', animationDuration: '1s' }}
          />
          <div
            className="absolute rounded-full bg-blue-400/5 animate-ping"
            style={{ width: '192px', height: '192px', animationDuration: '1.2s', animationDelay: '0.1s' }}
          />
        </>
      )}

      {state === 'connecting' && (
        <div
          className="absolute rounded-full border-2 border-amber-500/30 animate-spin"
          style={{ width: '160px', height: '160px', borderTopColor: 'rgb(245 158 11 / 0.8)' }}
        />
      )}

      {/* Core orb */}
      <div
        className="relative rounded-full flex items-center justify-center transition-all duration-150"
        style={{
          width: '120px',
          height: '120px',
          transform: `scale(${scale})`,
          background:
            state === 'ai-speaking'
              ? 'radial-gradient(circle at 40% 40%, #fbbf24, #d97706, #92400e)'
              : state === 'user-speaking'
              ? 'radial-gradient(circle at 40% 40%, #93c5fd, #3b82f6, #1d4ed8)'
              : state === 'connecting'
              ? 'radial-gradient(circle at 40% 40%, #78716c, #44403c, #1c1917)'
              : state === 'ended'
              ? 'radial-gradient(circle at 40% 40%, #4b5563, #374151, #1f2937)'
              : 'radial-gradient(circle at 40% 40%, #78716c, #57534e, #292524)',
          boxShadow:
            state === 'ai-speaking'
              ? '0 0 40px rgba(245, 158, 11, 0.5), 0 0 80px rgba(245, 158, 11, 0.2)'
              : state === 'user-speaking'
              ? '0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.15)'
              : '0 0 20px rgba(0,0,0,0.5)',
        }}
      >
        {/* Inner glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: '60px',
            height: '60px',
            background:
              state === 'ai-speaking'
                ? 'radial-gradient(circle, rgba(255,255,255,0.3), transparent)'
                : state === 'user-speaking'
                ? 'radial-gradient(circle, rgba(255,255,255,0.25), transparent)'
                : 'radial-gradient(circle, rgba(255,255,255,0.1), transparent)',
          }}
        />

        {/* State icon */}
        {state === 'idle' && (
          <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
        {state === 'connecting' && (
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        )}
        {state === 'ended' && (
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  );
}
