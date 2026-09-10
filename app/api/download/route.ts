import { NextResponse } from 'next/server';

// CORS response helper
function createCorsResponse(data: any, status: number) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Handle Browser Options Request (Preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return createCorsResponse({ error: 'URL is required' }, 400);
    }

    // Server-side fetch to bypass client CORS
    const apiResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({
        url: url,
        vQuality: '720',
      }),
    });

    const data = await apiResponse.json();
    const downloadUrl = data?.url || data?.picker?.[0]?.url;

    if (!apiResponse.ok || !downloadUrl) {
      return createCorsResponse({ error: 'Extraction failed for this link.' }, 400);
    }

    return createCorsResponse({ downloadUrl }, 200);
  } catch (err: any) {
    return createCorsResponse({ error: 'Server connection error' }, 500);
  }
}
