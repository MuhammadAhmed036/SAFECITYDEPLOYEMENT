import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { pool } from '../../../lib/db.js';

// Function to get Luna streams endpoint from database
async function getLunaStreamsEndpoint() {
  try {
    const result = await pool.query(
      "SELECT url FROM endpoints WHERE name = 'streams_direct' AND is_active = true LIMIT 1"
    );
    if (result.rows.length > 0) {
      const baseUrl = result.rows[0].url;
      return `${baseUrl}?order=desc&page=1&page_size=100`;
    }
    // Fallback to default if not found in database
    return 'http://192.168.18.70:8080/api/luna-streams/1/streams?order=desc&page=1&page_size=100';
  } catch (error) {
    console.error('Error fetching Luna streams endpoint from database:', error);
    // Fallback to default
    return 'http://192.168.18.70:8080/api/luna-streams/1/streams?order=desc&page=1&page_size=100';
  }
}

// Function to load Luna streams mock data for clustering
function loadLunaStreamsData() {
  try {
    const filePath = path.join(process.cwd(), 'luna streams mock api data.txt');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return data?.streams || [];
  } catch (error) {
    console.error('Error loading Luna streams mock data:', error);
    return [];
  }
}

export async function GET() {
  try {
    // Get Luna streams endpoint from database
    const STREAMS_API = await getLunaStreamsEndpoint();
    console.log('[Streams API] Fetching from:', STREAMS_API);
    
    // Try to fetch from real API first
    let realStreams = [];
    let usingRealAPI = false;
    try {
      const response = await fetch(STREAMS_API, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        realStreams = data?.streams || [];
        usingRealAPI = true;
        console.log(`[Streams API] Successfully fetched ${realStreams.length} real streams from API`);
      }
    } catch (apiError) {
      console.log('[Streams API] Real API unavailable, using mock data only:', apiError.message);
    }
    
    let finalStreams = [];
    let dataSource = 'mock';
    
    if (usingRealAPI && realStreams.length > 0) {
      // When real API is available and has data, use only real streams
      finalStreams = realStreams;
      dataSource = 'real_api';
      console.log(`[Streams API] Using real API data: ${realStreams.length} streams`);
    } else {
      // Fallback to mock data when real API is unavailable or has no data
      const lunaStreams = loadLunaStreamsData();
      finalStreams = lunaStreams;
      dataSource = 'mock';
      console.log(`[Streams API] Using mock data: ${lunaStreams.length} Luna streams`);
    }
    
    // Filter out streams without valid coordinates for clustering
    const streamsWithCoordinates = finalStreams.filter(stream => {
      const lat = stream?.location?.geo_position?.latitude;
      const lng = stream?.location?.geo_position?.longitude;
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
    
    console.log(`[Streams API] Total streams for clustering: ${streamsWithCoordinates.length} (${finalStreams.length - streamsWithCoordinates.length} skipped without coordinates)`);
    
    return NextResponse.json({
      streams: streamsWithCoordinates,
      total: streamsWithCoordinates.length,
      data_source: dataSource,
      real_api_available: usingRealAPI,
      endpoint_used: STREAMS_API
    });
  } catch (error) {
    console.error('[Streams API] Error:', error.message);
    
    // Fallback to Luna streams mock data only
    const lunaStreams = loadLunaStreamsData();
    const streamsWithCoordinates = lunaStreams.filter(stream => {
      const lat = stream?.location?.geo_position?.latitude;
      const lng = stream?.location?.geo_position?.longitude;
      return Number.isFinite(lat) && Number.isFinite(lng);
    });
    
    return NextResponse.json({
      streams: streamsWithCoordinates,
      total: streamsWithCoordinates.length,
      real_streams: 0,
      luna_streams: streamsWithCoordinates.length,
      fallback: true,
      error: 'Using fallback Luna streams data'
    });
  }
}