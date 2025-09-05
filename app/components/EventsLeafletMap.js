'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Import leaflet CSS only (not the JS library)
import 'leaflet/dist/leaflet.css';

// Dynamically import the component with no SSR to avoid 'window is not defined' errors
const LeafletMap = dynamic(() => import('./LeafletMapClient'), {
  ssr: false,
  loading: () => (
    <div 
      style={{ 
        width: '100%', 
        height: 420, 
        borderRadius: 8, 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        border: '1px solid #eee'
      }}
    >
      <div>Loading map...</div>
    </div>
  ),
});

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://192.168.18.70:5000';

// Camera locations with exact coordinates for 40 cameras in Wah Cantt
const SOURCE_COORDS = {
  // Main NTS Office Area
  NTS_Office_29: [33.6770, 73.0632], // Main NTS Office
  NTS_Camera_1: [33.6850, 73.0490], // Camera 1 - North entrance
  NTS_Camera_2: [33.6840, 73.0470], // Camera 2 - South entrance
  NTS_Camera_3: [33.6835, 73.0485], // Camera 3 - East wing
  NTS_Camera_4: [33.6855, 73.0475], // Camera 4 - West wing
  NTS_Camera_5: [33.6848, 73.0465], // Camera 5 - Parking area
  NTS_Camera_6: [33.6838, 73.0495], // Camera 6 - Main hall
  NTS_Camera_7: [33.6860, 73.0480], // Camera 7 - Conference room
  NTS_Camera_8: [33.6845, 73.0460], // Camera 8 - Reception
  NTS_Camera_9: [33.6830, 73.0475], // Camera 9 - Security gate
  NTS_Camera_10: [33.6852, 73.0485], // Camera 10 - Special monitoring
  
  // Wah Cantt City Center
  WAH_Camera_11: [33.7650, 72.7760], // City Center - Main Market
  WAH_Camera_12: [33.7645, 72.7755], // City Center - Bus Terminal
  WAH_Camera_13: [33.7655, 72.7765], // City Center - Shopping Mall
  WAH_Camera_14: [33.7640, 72.7750], // City Center - Traffic Junction
  WAH_Camera_15: [33.7660, 72.7770], // City Center - Park Entrance
  
  // Wah Cantt Residential Areas
  WAH_Camera_16: [33.7680, 72.7790], // Residential - Sector A
  WAH_Camera_17: [33.7685, 72.7795], // Residential - Sector B
  WAH_Camera_18: [33.7675, 72.7785], // Residential - Sector C
  WAH_Camera_19: [33.7690, 72.7800], // Residential - Sector D
  WAH_Camera_20: [33.7670, 72.7780], // Residential - Main Gate
  
  // Wah Cantt Industrial Zone
  WAH_Camera_21: [33.7700, 72.7810], // Industrial - Factory Area 1
  WAH_Camera_22: [33.7705, 72.7815], // Industrial - Factory Area 2
  WAH_Camera_23: [33.7710, 72.7820], // Industrial - Warehouse Zone
  WAH_Camera_24: [33.7715, 72.7825], // Industrial - Loading Bay
  WAH_Camera_25: [33.7720, 72.7830], // Industrial - Security Checkpoint
  
  // Wah Cantt Educational Institutions
  WAH_Camera_26: [33.7730, 72.7840], // Education - University Main Gate
  WAH_Camera_27: [33.7735, 72.7845], // Education - College Entrance
  WAH_Camera_28: [33.7740, 72.7850], // Education - School Complex
  WAH_Camera_29: [33.7745, 72.7855], // Education - Library
  WAH_Camera_30: [33.7750, 72.7860], // Education - Sports Ground
  
  // Wah Cantt Transportation Hubs
  WAH_Camera_31: [33.7760, 72.7870], // Transport - Railway Station
  WAH_Camera_32: [33.7765, 72.7875], // Transport - Bus Terminal
  WAH_Camera_33: [33.7770, 72.7880], // Transport - Taxi Stand
  WAH_Camera_34: [33.7775, 72.7885], // Transport - Highway Entrance
  WAH_Camera_35: [33.7780, 72.7890], // Transport - Toll Plaza
  
  // Wah Cantt Government Buildings
  WAH_Camera_36: [33.7790, 72.7900], // Government - Municipal Office
  WAH_Camera_37: [33.7795, 72.7905], // Government - Police Station
  WAH_Camera_38: [33.7800, 72.7910], // Government - Court Complex
  WAH_Camera_39: [33.7805, 72.7915], // Government - Post Office
  WAH_Camera_40: [33.7810, 72.7920], // Government - Administrative Block
};

const imgUrl = (p) => (p?.startsWith('http') ? p : `${BASE}${p}`);



// --- helpers to spread overlapping markers ---

// meters -> degree deltas near given latitude
function metersToDeg(lat, dxMeters, dyMeters) {
  const oneDegLatMeters = 111_320; // ~ meters per degree latitude
  const oneDegLngMeters = 111_320 * Math.cos((lat * Math.PI) / 180); // varies with latitude
  return [dyMeters / oneDegLatMeters, dxMeters / oneDegLngMeters];
}

// arrange n points around a circle (and center if odd big n) with given radius in meters
function radialOffsets(n, radiusMeters) {
  // return array of [dxMeters, dyMeters]
  if (n <= 1) return [[0, 0]];
  const out = [];
  const angleStep = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const a = i * angleStep;
    const dx = radiusMeters * Math.cos(a);
    const dy = radiusMeters * Math.sin(a);
    out.push([dx, dy]);
  }
  return out;
}

// group events by a lat/lng key so we know which ones overlap
function groupByLatLng(items, precision = 6) {
  const map = new Map();
  for (const it of items) {
    const key = `${it.lat.toFixed(precision)},${it.lng.toFixed(precision)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return map;
}

export default function EventsLeafletMap({ events = [], streams = [] }) {
  const totalItems = events.length + streams.length;
  return (
    <div className="mb-4">
      <h4 className="mb-3">Map — Wah Cantt Camera Network ({events.length} events, {streams.length} streams)</h4>
      <LeafletMap events={events} streams={streams} />
    </div>
  );
}
