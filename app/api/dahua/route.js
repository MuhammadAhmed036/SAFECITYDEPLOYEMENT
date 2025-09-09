import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db.js';
import fs from 'fs';
import path from 'path';

// Function to get Dahua endpoint from database
async function getDahuaEndpoint() {
  try {
    const result = await pool.query(
      "SELECT url FROM endpoints WHERE name = 'dahua_direct' AND is_active = true LIMIT 1"
    );
    if (result.rows.length > 0) {
      return result.rows[0].url;
    }
    // Fallback to environment variable or default if not found in database
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://192.168.18.28:14001';
    return `${baseUrl}/cameras`;
  } catch (error) {
    console.error('Error fetching Dahua endpoint from database:', error);
    // Fallback to environment variable or default
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE || 'http://192.168.18.28:14001';
    return `${baseUrl}/cameras`;
  }
}

// Function to load mock Dahua data
function loadMockCameras() {
  try {
    const mockDataPath = path.join(process.cwd(), 'dahua api data mock.txt');
    const mockData = fs.readFileSync(mockDataPath, 'utf8');
    const parsedData = JSON.parse(mockData);
    return parsedData.items || [];
  } catch (error) {
    console.error('Error loading mock Dahua data:', error);
    return [];
  }
}

// Proxy API route for Dahua cameras
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '1000');
  const useMock = searchParams.get('mock') === 'true';
  
  // If mock parameter is true, return mock data
  if (useMock) {
    const mockCameras = loadMockCameras();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCameras = mockCameras.slice(startIndex, endIndex);
    
    console.log(`[Dahua API] Returning ${paginatedCameras.length} mock cameras (page ${page}, size ${pageSize})`);
    
    return NextResponse.json({
      total: mockCameras.length,
      count: paginatedCameras.length,
      offset: startIndex,
      limit: pageSize,
      items: paginatedCameras
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
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
    
    // Fallback to mock data on error
    console.log('[Dahua API] Falling back to mock data due to error');
    const mockCameras = loadMockCameras();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCameras = mockCameras.slice(startIndex, endIndex);
    
    return NextResponse.json({
      total: mockCameras.length,
      count: paginatedCameras.length,
      offset: startIndex,
      limit: pageSize,
      items: paginatedCameras,
      fallback: true
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
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