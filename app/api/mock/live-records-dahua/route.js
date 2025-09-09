import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the mock data from the text file
    const filePath = path.join(process.cwd(), 'dahua api data mock.txt');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const mockData = JSON.parse(fileContent);
    
    console.log(`[Mock Live Records Dahua] Returning ${mockData.items?.length || 0} Dahua cameras`);
    
    return NextResponse.json(mockData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('[Mock Live Records Dahua] Error reading mock data:', error);
    return NextResponse.json(
      { error: 'Failed to load mock Dahua data', items: [] },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}