import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Function to load Luna streams data from the .txt file
function loadLunaStreamsData() {
  try {
    const filePath = path.join(process.cwd(), 'luna streams mock api data.txt');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return data;
  } catch (error) {
    console.error('Error loading Luna streams mock data:', error);
    // Fallback to a basic structure if file reading fails
    return {
      "streams": []
    };
  }
}

export async function GET() {
  // Load data from the Luna streams mock data file
  const mockData = loadLunaStreamsData();
  
  // Return the loaded data as a JSON response
  return NextResponse.json(mockData);
}