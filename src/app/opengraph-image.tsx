import { ImageResponse } from 'next/og';

export const alt = 'The Invisible Rule';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'white',
          padding: '60px',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #fbbf24, #d97706, #92400e)',
            borderRadius: '50%',
            color: 'white',
            fontSize: 66,
            fontWeight: 700,
            letterSpacing: '-2px',
            marginBottom: 48,
          }}
        >
          IR
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 300,
            letterSpacing: '-1.5px',
            color: 'white',
            marginBottom: 18,
          }}
        >
          The Invisible Rule
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#cbd5e1',
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          Discover the hidden belief that has been running your life.
        </div>
      </div>
    ),
    { ...size },
  );
}
