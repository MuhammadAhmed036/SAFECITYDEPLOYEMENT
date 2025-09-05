import { NextResponse } from 'next/server';

// Real API endpoint for streams
const STREAMS_API = 'http://192.168.18.70:8080/api/luna-streams/1/streams?order=desc&page=1&page_size=100';

export async function GET() {
  try {
    console.log('[Streams API] Fetching from:', STREAMS_API);
    
    const response = await fetch(STREAMS_API, {
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
    console.log(`[Streams API] Successfully fetched ${data?.streams?.length || 0} streams`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Streams API] Error:', error.message);
    
    // Return error response that client can handle
    return NextResponse.json(
      { 
        error: 'Failed to fetch streams data',
        message: error.message,
        streams: [] 
      },
      { status: 500 }
    );
  }
}