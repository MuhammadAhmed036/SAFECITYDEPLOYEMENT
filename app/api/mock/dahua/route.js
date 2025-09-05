import { NextResponse } from 'next/server';

// Mock API route for Dahua cameras - provides test data when real API is unavailable
export async function GET(request) {
  console.log('[Mock Dahua API] Serving mock camera data');
  
  // Mock data based on the provided sample
  const mockCameras = [
    {
      "id": 1,
      "camera_name": "3rd Avenue",
      "track_id": "dahua_camera_office1",
      "lat": 55.752,
      "lon": 36.616,
      "active": 1,
      "city": "New York",
      "area": "rawalpindi",
      "district": "Midtown",
      "street": "West 48th street",
      "house_number": "220",
      "user_data": "face of person",
      "tags": "tag_1,tag_2",
      "stream_id": "8950722f-3fd4-4223-0000-03f95f0e8dfb",
      "image_type": 0,
      "aggregate_attributes": 0,
      "use_exif_info": 1,
      "base_url": "http://192.168.18.89:8088/",
      "created_at": "2025-08-13T11:32:10Z",
      "updated_at": "2025-08-13T11:32:10Z"
    },
    {
      "id": 2,
      "camera_name": "VM Proxy",
      "track_id": "dahua_proxy_8081",
      "lat": 33.6051,
      "lon": 73.0479,
      "active": 1,
      "city": "Rawalpindi",
      "area": "Saddar",
      "district": "Rawalpindi District",
      "street": "Kashmir Road",
      "house_number": "12",
      "user_data": "image stream",
      "tags": "proxy,images,8081",
      "stream_id": "proxy-8081",
      "image_type": 0,
      "aggregate_attributes": 0,
      "use_exif_info": 1,
      "base_url": "http://192.168.18.28:8081/",
      "created_at": "2025-08-18T07:52:28Z",
      "updated_at": "2025-08-18T07:52:28Z"
    },
    {
      "id": 3,
      "camera_name": "VM Proxy",
      "track_id": "dahua_proxy_8082",
      "lat": 33.5972,
      "lon": 73.0605,
      "active": 1,
      "city": "Rawalpindi",
      "area": "Raja Bazaar",
      "district": "Rawalpindi District",
      "street": "Pandora Road",
      "house_number": "18",
      "user_data": "image stream",
      "tags": "proxy,images,8082",
      "stream_id": "proxy-8082",
      "image_type": 0,
      "aggregate_attributes": 0,
      "use_exif_info": 1,
      "base_url": "http://192.168.18.28:8082/",
      "created_at": "2025-08-18T11:19:41Z",
      "updated_at": "2025-08-18T11:19:41Z"
    },
    {
      "id": 4,
      "camera_name": "VM Proxy",
      "track_id": "dahua_proxy_8083",
      "lat": 33.6268,
      "lon": 73.0772,
      "active": 1,
      "city": "Rawalpindi",
      "area": "Satellite Town B",
      "district": "Rawalpindi District",
      "street": "6th Road",
      "house_number": "27",
      "user_data": "image stream",
      "tags": "proxy,images,8083",
      "stream_id": "proxy-8083",
      "image_type": 0,
      "aggregate_attributes": 0,
      "use_exif_info": 1,
      "base_url": "http://192.168.18.28:8083/",
      "created_at": "2025-08-18T11:19:41Z",
      "updated_at": "2025-08-18T11:19:41Z"
    },
    {
      "id": 5,
      "camera_name": "VM Proxy",
      "track_id": "dahua_proxy_8084",
      "lat": 33.634,
      "lon": 73.0874,
      "active": 1,
      "city": "Rawalpindi",
      "area": "Satellite Town C",
      "district": "Rawalpindi District",
      "street": "5th Road",
      "house_number": "44",
      "user_data": "image stream",
      "tags": "proxy,images,8084",
      "stream_id": "proxy-8084",
      "image_type": 0,
      "aggregate_attributes": 0,
      "use_exif_info": 1,
      "base_url": "http://192.168.18.28:8084/",
      "created_at": "2025-08-18T11:19:41Z",
      "updated_at": "2025-08-18T11:19:41Z"
    }
  ];
  
  // Sort by created_at (latest first)
  const sortedCameras = mockCameras.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Return the mock data in the same format as real API (with items array)
  const response = {
    total: sortedCameras.length,
    count: sortedCameras.length,
    offset: 0,
    limit: 1000,
    items: sortedCameras
  };
  
  return NextResponse.json(response, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
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

// POST method not supported for mock data
export async function POST(request) {
  return NextResponse.json(
    { error: 'POST method not supported for mock Dahua API' },
    { status: 405 }
  );
}