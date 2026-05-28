import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: '50%',
          color: 'white',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '-0.5px',
        }}
      >
        IR
      </div>
    ),
    { ...size },
  );
}
