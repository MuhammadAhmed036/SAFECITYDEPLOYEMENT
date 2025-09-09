import { NextResponse } from 'next/server';

// Mock data that matches the structure of the real API response
const generateMockEvents = () => {
  const cities = ['Islamabad', 'Rawalpindi', 'Lahore', 'Karachi'];
  const areas = ['Blue Area', 'F-6', 'G-9', 'I-8', 'Saddar', 'Mall Road', 'DHA', 'Gulberg'];
  const sources = ['Camera_01', 'Camera_02', 'Camera_03', 'Camera_04', 'Camera_05'];
  const labels = ['Person', 'Vehicle', 'Suspicious Activity', 'Unknown Object'];
  
  const events = [];
  const now = new Date();
  
  for (let i = 0; i < 25; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const label = labels[Math.floor(Math.random() * labels.length)];
    
    // Generate random coordinates within Pakistan bounds
    const lat = 24.8607 + Math.random() * (36.8776 - 24.8607);
    const lng = 61.8719 + Math.random() * (77.8374 - 61.8719);
    
    const sampleId = `mock-sample-${i + 1}-${Math.random().toString(36).substr(2, 9)}`;
    
    const event = {
      event_id: `mock_event_${i + 1}`,
      source: `${city}_${source}`,
      create_time: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      image_origin: `/mock-images/person-${(i % 10) + 1}.svg`,
      face_detections: [{
        sample_id: sampleId,
        detect_time: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        detect_ts: null,
        detection: {
          rect: {
            x: Math.floor(Math.random() * 800) + 100,
            y: Math.floor(Math.random() * 600) + 100,
            width: Math.floor(Math.random() * 200) + 150,
            height: Math.floor(Math.random() * 250) + 200
          }
        }
      }],
      top_match: {
        label: label,
        similarity: 0.7 + Math.random() * 0.3
      },
      location: {
        city: city,
        area: area,
        geo_position: {
          latitude: lat,
          longitude: lng
        }
      },
      user_data: `Mock detection ${i + 1}`,
      detection_time: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    };
    
    events.push(event);
  }
  
  return events.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
};

const mockData = generateMockEvents();

export async function GET() {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return in the same format as real API
  return NextResponse.json({
    events: mockData,
    total: mockData.length,
    page: 1,
    page_size: mockData.length
  });
}