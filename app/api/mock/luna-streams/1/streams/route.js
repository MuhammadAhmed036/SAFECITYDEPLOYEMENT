import { NextResponse } from 'next/server';

// Mock data that matches the structure of the real API response
const mockData = {
  "streams": [
    {
      "stream_id": "463f36ef-5c4f-4a94-a312-af41577b7ffb",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "Blue Area Savour Food",
      "description": "",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.45.78:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true,
        "droi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        }
      },
      "location": {
        "city": "Rawalpindi",
        "area": "Scheme-3",
        "district": "Rawalpindi",
        "street": "16th",
        "house_number": "342",
        "geo_position": {
          "longitude": 33.580079,
          "latitude": 73.088856
        }
      },
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 0,
        "last_attempt_time": "2025-03-14T13:52:46.901776+05:00",
        "status": "enabled"
      },
      "status": "pause",
      "version": 7,
      "create_time": "2025-03-11T15:34:31.394846+05:00",
      "event_handler": {
        "origin": "http://127.0.0.1:5000/",
        "api_version": 6,
        "bestshot_handler": {
          "handler_id": "b2871790-039c-4e2d-bb1b-7bebe1ebb7d9"
        },
        "frame_store": "http://127.0.0.1:5000/6/images",
        "authorization": {
          "account_id": "00000000-0000-4000-b000-000000000146"
        },
        "detection_handler": null
      },
      "groups": []
    },
    {
      "stream_id": "5fa16d82-2512-4ad1-86b5-98dcf921646f",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "F-10 Markaz",
      "description": "F-10 Markaz shopping area",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.40.218:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true
      },
      "location": {
        "city": "Islamabad",
        "area": "F-10",
        "district": "Islamabad",
        "street": "Main Road",
        "house_number": "22",
        "geo_position": {
          "latitude": 33.6955,
          "longitude": 73.0134
        }
      },
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 2,
        "last_attempt_time": "2025-03-14T14:52:46.901776+05:00",
        "status": "enabled"
      },
      "status": "inactive",
      "version": 3,
      "create_time": "2025-03-10T09:22:15.628974+05:00"
    },
    {
      "stream_id": "7bc16d82-3612-4ad1-86b5-98dcf921777e",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "G-9 Market",
      "description": "G-9 Market area",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.41.100:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true
      },
      "location": {
        "city": "Islamabad",
        "area": "G-9",
        "district": "Islamabad",
        "street": "Market Road",
        "house_number": "15",
        "geo_position": {
          "latitude": 33.6855,
          "longitude": 73.0334
        }
      },
      "autorestart": {
        "restart": 0,
        "attempt_count": 0,
        "delay": 0,
        "current_attempt": 0,
        "last_attempt_time": null,
        "status": "disabled"
      },
      "status": "error",
      "version": 2,
      "create_time": "2025-03-09T11:45:30.628974+05:00"
    },
    {
      "stream_id": "9de16d82-4712-4ad1-86b5-98dcf921888f",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "I-8 Markaz",
      "description": "I-8 Markaz shopping area",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.42.150:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true
      },
      "location": {
        "city": "Islamabad",
        "area": "I-8",
        "district": "Islamabad",
        "street": "Markaz Road",
        "house_number": "33",
        "geo_position": {
          "latitude": 33.6755,
          "longitude": 73.0534
        }
      },
      "autorestart": {
        "restart": 1,
        "attempt_count": 10,
        "delay": 60,
        "current_attempt": 0,
        "last_attempt_time": "2025-03-14T12:30:46.901776+05:00",
        "status": "enabled"
      },
      "status": "active",
      "version": 4,
      "create_time": "2025-03-08T14:33:22.628974+05:00"
    },
    {
      "stream_id": "2fe16d82-5812-4ad1-86b5-98dcf921999g",
      "account_id": "00000000-0000-4000-b000-000000000146",
      "name": "F-7 Jinnah Super",
      "description": "F-7 Jinnah Super market area",
      "data": {
        "type": "tcp",
        "reference": "rtsp://admin:admin123@10.0.43.200:554",
        "roi": {
          "x": 0,
          "y": 0,
          "width": 0,
          "height": 0,
          "mode": "abs"
        },
        "rotation": 0,
        "preferred_program_stream_frame_width": 800,
        "endless": true
      },
      "location": {
        "city": "Islamabad",
        "area": "F-7",
        "district": "Islamabad",
        "street": "Jinnah Super",
        "house_number": "45",
        "geo_position": {
          "latitude": 33.7155,
          "longitude": 73.0434
        }
      },
      "autorestart": {
        "restart": 0,
        "attempt_count": 0,
        "delay": 0,
        "current_attempt": 0,
        "last_attempt_time": null,
        "status": "disabled"
      },
      "status": "inactive",
      "version": 2,
      "create_time": "2025-03-07T16:20:10.628974+05:00"
    }
  ]
};

export async function GET() {
  // Return the mock data as a JSON response
  return NextResponse.json(mockData);
}