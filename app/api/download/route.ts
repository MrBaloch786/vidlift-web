import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle browser preflight OPTIONS request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Call server-side processing node
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
      return NextResponse.json(
        { error: data?.text || 'Extraction failed for this link.' },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { downloadUrl },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Server error occurred.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
