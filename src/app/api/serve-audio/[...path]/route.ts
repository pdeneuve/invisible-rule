import { NextRequest, NextResponse } from 'next/server';
import { head } from '@vercel/blob';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const blobPath = path.join('/');
    
    // Get blob info with download URL
    const blobInfo = await head(blobPath, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    
    if (!blobInfo || !blobInfo.downloadUrl) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // STREAM the content directly (don't redirect - Creatomate may not follow redirects)
    const audioResp = await fetch(blobInfo.downloadUrl);
    if (!audioResp.ok) {
      return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
    }
    
    const audioData = await audioResp.arrayBuffer();
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioData.byteLength),
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Serve audio error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
