import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fbbf24, #d97706, #92400e)',
          color: 'white',
          fontSize: 74,
          fontWeight: 700,
          letterSpacing: '-2px',
        }}
      >
        IR
      </div>
    ),
    { ...size },
  );
}
