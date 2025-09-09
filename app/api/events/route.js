import { NextResponse } from 'next/server';

// Real API endpoint for events - use environment variable
const EVENTS_API = process.env.NEXT_PUBLIC_API_BASE ? 
  `${process.env.NEXT_PUBLIC_API_BASE}/6/events` : 
  'http://192.168.18.70:5000/6/events';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '200';
  
  // Construct the target URL with query parameters
  const targetUrl = `${EVENTS_API}?page=${page}&page_size=${pageSize}`;
  
  console.log('[Events API] Fetching from:', targetUrl);
  
  try {
    const response = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Events API] Successfully fetched ${data?.events?.length || data?.length || 0} events`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Events API] Error:', error.message);
    
    // Return error response that client can handle
    return NextResponse.json(
      { 
        error: 'Failed to fetch events data',
        message: error.message,
        events: [] 
      },
      { status: 500 }
    );
  }
}
