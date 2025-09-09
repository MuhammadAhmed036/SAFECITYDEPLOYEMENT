import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db.js';

// Function to get Dahua endpoint from database
async function getDahuaEndpoint() {
  try {
    const result = await pool.query(
      "SELECT url FROM endpoints WHERE name = 'dahua_direct' AND is_active = true LIMIT 1"
    );
    if (result.rows.length > 0) {
      return result.rows[0].url;
    }
    // Fallback to default if not found in database
    return 'http://192.168.18.28:14001/cameras';
  } catch (error) {
    console.error('Error fetching Dahua endpoint from database:', error);
    // Fallback to default
    return 'http://192.168.18.28:14001/cameras';
  }
}

// Proxy API route for Dahua cameras
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '1000';
  
  // Get Dahua endpoint from database
  const DAHUA_API = await getDahuaEndpoint();
  const targetUrl = `${DAHUA_API}?page=${page}&page_size=${pageSize}`;
  
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