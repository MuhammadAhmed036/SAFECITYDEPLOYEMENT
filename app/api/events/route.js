import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Real API endpoint for events - use environment variable
const EVENTS_API = process.env.NEXT_PUBLIC_API_BASE ? 
  `${process.env.NEXT_PUBLIC_API_BASE}/6/events` : 
  'http://192.168.18.70:5000/6/events';

// Function to load mock data
function loadMockEvents() {
  try {
    const mockDataPath = path.join(process.cwd(), 'events api mock data.txt');
    const mockData = fs.readFileSync(mockDataPath, 'utf8');
    return JSON.parse(mockData);
  } catch (error) {
    console.error('Error loading mock events data:', error);
    return { events: [] };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('page_size') || '900');
  const useMock = searchParams.get('mock') === 'true';
  
  // If mock parameter is true, return mock data
  if (useMock) {
    const mockData = loadMockEvents();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = mockData.events.slice(startIndex, endIndex);
    
    console.log(`[Events API] Returning ${paginatedEvents.length} mock events (page ${page}, size ${pageSize})`);
    
    return NextResponse.json({
      events: paginatedEvents,
      total: mockData.events.length,
      page: page,
      page_size: pageSize
    });
  }
  
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
    
    // Fallback to mock data on error
    console.log('[Events API] Falling back to mock data due to error');
    const mockData = loadMockEvents();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = mockData.events.slice(startIndex, endIndex);
    
    return NextResponse.json({
      events: paginatedEvents,
      total: mockData.events.length,
      page: page,
      page_size: pageSize,
      fallback: true
    });
  }
}
