import { NextResponse } from 'next/server';

// Proxy API route for Dahua cameras
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '200';
  
  // The actual Dahua API server URL
  const API_BASE = 'http://192.168.18.38:8081';
  const targetUrl = `${API_BASE}/cameras?page=${page}&page_size=${pageSize}`;
  
  console.log('[Dahua API] Proxying request to:', targetUrl);
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      console.log('[Dahua API] Server responded with status:', response.status);
      return NextResponse.json(
        { error: `Server responded with status ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('[Dahua API] Received data:', data?.length || 0, 'cameras');
    
    // Return the data with proper CORS headers
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    
  } catch (error) {
    console.log('[Dahua API] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to connect to Dahua API server', details: error.message },
      { status: 503 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}