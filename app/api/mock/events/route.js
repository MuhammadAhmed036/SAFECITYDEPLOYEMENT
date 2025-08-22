import { NextResponse } from 'next/server';

// Mock data that matches the structure of the real API response
const mockData = [
  {
    "id": "e1",
    "source": "NTS_Office_33",
    "timestamp": "2023-08-07T10:15:30.000Z",
    "image_origin": "/images/person1.jpg",
    "top_match": {
      "label": "Person A",
      "similarity": 0.92
    }
  },
  {
    "id": "e2",
    "source": "NTS_Office_33",
    "timestamp": "2023-08-07T10:20:45.000Z",
    "image_origin": "/images/person2.jpg",
    "top_match": {
      "label": "Person B",
      "similarity": 0.85
    }
  },
  {
    "id": "e3",
    "source": "Centaurus_Mall_Gate1",
    "timestamp": "2023-08-07T11:05:22.000Z",
    "image_origin": "/images/person3.jpg",
    "top_match": {
      "label": "Person C",
      "similarity": 0.78
    }
  },
  {
    "id": "e4",
    "source": "Centaurus_Mall_Gate2",
    "timestamp": "2023-08-07T11:10:15.000Z",
    "image_origin": "/images/person4.jpg",
    "top_match": {
      "label": "Person D",
      "similarity": 0.95
    }
  },
  {
    "id": "e5",
    "source": "Centaurus_Mall_Gate3",
    "timestamp": "2023-08-07T11:15:30.000Z",
    "image_origin": "/images/person5.jpg",
    "top_match": {
      "label": "Person E",
      "similarity": 0.88
    }
  }
];

export async function GET() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return NextResponse.json(mockData);
}