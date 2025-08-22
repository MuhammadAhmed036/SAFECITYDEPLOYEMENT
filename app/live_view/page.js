'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from '../dashboard/dashboard.module.css';

const LiveViewMap = dynamic(() => import('../components/LiveViewMapClient'), { ssr: false });

/* ----------------------- Config ----------------------- */
const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://192.168.18.70:5000';
const EVENTS_API = `${BASE}/6/events?page=1&page_size=200`;      // on-demand fetch
const EVENTS_WS = `${BASE.replace(/^http/, 'ws')}/6/events/ws`;   // WebSocket connection

// OPTIONAL: set to true to start a gentle polling fallback when WebSocket is offline for a while
const ENABLE_POLL_FALLBACK = true;

// Mock data configuration
const USE_MOCK_DATA = true; // Set to false when real server is available

/* ----------------------- Mock Data Generator ----------------------- */
const MOCK_PERSONS = [
  { name: 'Ahmed Hassan', id: 'P001', confidence: 0.95 },
  { name: 'Sarah Johnson', id: 'P002', confidence: 0.88 },
  { name: 'Mohamed Ali', id: 'P003', confidence: 0.92 },
  { name: 'Lisa Chen', id: 'P004', confidence: 0.87 },
  { name: 'Omar Khalil', id: 'P005', confidence: 0.91 },
  { name: 'Emma Wilson', id: 'P006', confidence: 0.89 },
  { name: 'Youssef Ahmed', id: 'P007', confidence: 0.94 },
  { name: 'Anna Rodriguez', id: 'P008', confidence: 0.86 },
  { name: 'Khaled Mahmoud', id: 'P009', confidence: 0.93 },
  { name: 'Sophie Martin', id: 'P010', confidence: 0.90 }
];

const MOCK_LOCATIONS = [
  { city: 'Cairo', area: 'Downtown', lat: 30.0444, lng: 31.2357 },
  { city: 'Cairo', area: 'Zamalek', lat: 30.0626, lng: 31.2197 },
  { city: 'Cairo', area: 'Maadi', lat: 29.9602, lng: 31.2569 },
  { city: 'Giza', area: 'Dokki', lat: 30.0388, lng: 31.2125 },
  { city: 'Giza', area: 'Mohandessin', lat: 30.0626, lng: 31.2000 },
  { city: 'Alexandria', area: 'Corniche', lat: 31.2001, lng: 29.9187 },
  { city: 'Alexandria', area: 'Sidi Gaber', lat: 31.2156, lng: 29.9553 },
  { city: 'Wah Cantt', area: 'Yum Bakery Wah Cantt', lat: 33.79279, lng: 72.72503 },
  { city: 'Tanta', area: 'Main Square', lat: 30.7865, lng: 31.0004 },
  { city: 'Aswan', area: 'Nile View', lat: 24.0889, lng: 32.8998 },
  { city: 'Islamabad', area: 'F-10 Markaz', lat: 33.7215, lng: 73.0433 },
  { city: 'Islamabad', area: 'Centaurus Mall', lat: 33.7077, lng: 73.0397 },
  { city: 'Islamabad', area: 'Blue Area', lat: 33.7077, lng: 73.0397 },
  { city: 'Islamabad', area: 'F-8 Sector', lat: 33.6844, lng: 73.0479 },
  { city: 'Rawalpindi', area: 'Saddar Bazaar', lat: 33.5651, lng: 73.0169 },
  { city: 'Rawalpindi', area: 'Committee Chowk', lat: 33.6007, lng: 73.0679 },
  { city: 'Rawalpindi', area: 'NTS Office', lat: 33.6844, lng: 73.0479 },
  { city: 'Rawalpindi', area: 'Commercial Market', lat: 33.5651, lng: 73.0169 }
];

const MOCK_CAMERAS = [
  'CAM_001_ENTRANCE', 'CAM_002_LOBBY', 'CAM_003_PARKING', 'CAM_004_CORRIDOR',
  'CAM_005_ELEVATOR', 'CAM_006_ROOFTOP', 'CAM_007_GARDEN', 'CAM_008_GATE',
  'CAM_009_SECURITY', 'CAM_010_BACKUP', 'CAM_011_STREET', 'CAM_012_PLAZA'
];

const MOCK_IMAGES = [
  '/mock-images/person-1.svg', '/mock-images/person-2.svg', '/mock-images/person-3.svg',
  '/mock-images/person-4.svg', '/mock-images/person-5.svg', '/mock-images/person-6.svg',
  '/mock-images/person-7.svg', '/mock-images/person-8.svg', '/mock-images/person-9.svg',
  '/mock-images/person-10.svg'
];

// Helper function to ensure local image URLs
function getLocalImageUrl(imagePath) {
  // Ensure the image path starts with / for local serving
  if (imagePath && !imagePath.startsWith('http')) {
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }
  return imagePath;
}

function generateMockEvent() {
  const person = MOCK_PERSONS[Math.floor(Math.random() * MOCK_PERSONS.length)];
  const location = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
  const camera = MOCK_CAMERAS[Math.floor(Math.random() * MOCK_CAMERAS.length)];
  const image = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
  const similarity = 0.75 + Math.random() * 0.25; // 75-100% similarity
  const confidence = 0.80 + Math.random() * 0.20; // 80-100% confidence
  
  // Generate timestamp within last 24 hours
  const now = new Date();
  const randomHours = Math.random() * 24;
  const eventTime = new Date(now.getTime() - randomHours * 60 * 60 * 1000);
  
  const localImage = getLocalImageUrl(image);
  
  return {
    event_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: camera,
    create_time: eventTime.toISOString(),
    detect_time: eventTime.toISOString(),
    snapshot: localImage,
    image: localImage,
    image_url: localImage,
    location: {
      city: location.city,
      area: location.area,
      geo_position: {
        latitude: location.lat + (Math.random() - 0.5) * 0.01, // Add small random offset
        longitude: location.lng + (Math.random() - 0.5) * 0.01
      }
    },
    top_match: {
      label: person.name,
      similarity: similarity,
      confidence: confidence,
      person_id: person.id
    },
    user_data: person.name,
    face_detections: [{
      detect_time: eventTime.toISOString(),
      confidence: confidence,
      image_origin: localImage,
      bounding_box: {
        x: Math.floor(Math.random() * 200),
        y: Math.floor(Math.random() * 200),
        width: 100 + Math.floor(Math.random() * 50),
        height: 100 + Math.floor(Math.random() * 50)
      }
    }],
    detection_quality: similarity > 0.9 ? 'high' : similarity > 0.8 ? 'medium' : 'low',
    alert_level: similarity > 0.95 ? 'critical' : similarity > 0.85 ? 'warning' : 'info'
  };
}

function generateInitialMockData(count = 50) {
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push(generateMockEvent());
  }
  // Sort by create_time descending (newest first)
  return events.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
}

/* ----------------------- Helpers ---------------------- */
function encodeUrl(u) { try { return encodeURI(u); } catch { return u; } }
function decodeUrl(u) { try { return decodeURI(u); } catch { return u; } }
function looksLikeImagePath(p) {
  return typeof p === 'string' && /\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/i.test(p.trim());
}
function viaProxy(u) { return `/api/image-proxy?url=${encodeURIComponent(u)}`; }
function normalizeBase(p) {
  if (!p) return null;
  return p.startsWith('http') ? p : `${BASE}${p}`;
}
function collectImageCandidates(ev, fd) {
  const rawList = [
    fd?.image_origin, ev?.snapshot, ev?.image, ev?.image_url, ev?.img, ev?.thumbnail,
    looksLikeImagePath(ev?.source) ? ev.source : null
  ].filter((c) => typeof c === 'string' && c.trim().length > 0)
   .map((s) => s.trim());

  const out = [];
  for (const raw of rawList) {
    // Check for mock images before normalizing to avoid remote URL conversion
    if (raw.includes('/mock-images/')) {
      const localPath = raw.startsWith('/') ? raw : `/${raw}`;
      out.push(localPath);
      continue;
    }

    const full = normalizeBase(raw);
    if (!full) continue;
    const variants = [full, encodeUrl(full), decodeUrl(full)];
    if (full.includes('%40')) variants.push(full.replaceAll('%40', '@'));
    for (const v of variants) {
      out.push(viaProxy(v)); // prefer proxy to avoid CORS
      out.push(v);           // keep direct as last resort
    }
  }
  return Array.from(new Set(out));
}

/* ----------------------- ImageTry --------------------- */
function ImageTry({ urls = [], alt }) {
  const [index, setIndex] = useState(0);
  const safeUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const current = safeUrls[index] || '/camera-icon.svg';

  useEffect(() => {
    setIndex(0);
  }, [safeUrls.join('|')]);

  const handleError = () => {
    for (let i = index + 1; i < safeUrls.length; i++) {
      if (safeUrls[i] && safeUrls[i] !== current) {
        setIndex(i);
        return;
      }
    }
    if (current !== '/camera-icon.svg') setIndex(safeUrls.length);
  };

  return (
    <img
      src={current}
      alt={alt}
      style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={handleError}
    />
  );
}

/* -------------------- Live View Page ------------------ */
export default function LiveViewPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTime, setRefreshTime] = useState(Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [selectedCity, setSelectedCity] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const eventIds = useRef(new Set()); // dedupe across updates

  // Add/merge events into state with dedupe and cap size
  const upsertEvents = (incoming) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    if (!list.length) return;

    setEvents((prev) => {
      const next = [...prev];
      for (const ev of list) {
        const key = ev?.event_id ?? `${ev?.source ?? ''}-${ev?.create_time ?? ''}-${ev?.top_match?.label ?? ''}`;
        if (!eventIds.current.has(key)) {
          eventIds.current.add(key);
          next.unshift(ev); // newest first
        }
      }
      return next.slice(0, 500); // cap growth
    });
    setRefreshTime(Date.now());
  };

  // Initial load (no interval)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (USE_MOCK_DATA) {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
          
          console.log('[LiveView] Using mock data');
          const mockEvents = generateInitialMockData(50);
          if (cancelled) return;
          upsertEvents(mockEvents);
          setError(null);
          setLoading(false);
          return;
        }

        const res = await fetch(EVENTS_API, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const initial = Array.isArray(data?.events) ? data.events : [];
        // reverse so newest ends up first after unshift ordering
        upsertEvents(initial.reverse());
        setError(null);
      } catch (e) {
        if (!cancelled) {
          if (USE_MOCK_DATA) {
            console.log('[LiveView] Falling back to mock data due to error');
            const mockEvents = generateInitialMockData(50);
            upsertEvents(mockEvents);
            setError(null);
          } else {
            setError(`Initial load failed: ${e?.message ?? e}`);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- WebSocket with exponential backoff ----------
  useEffect(() => {
    let ws = null;
    let closed = false;
    let retry = 0;
    let pollTimer = null;
    let offlineSince = 0;
    let mockTimer = null;

    const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };
    const stopMockTimer = () => { if (mockTimer) { clearInterval(mockTimer); mockTimer = null; } };

    const startMockDataStream = () => {
      if (mockTimer) return;
      console.log('[LiveView] Starting mock data stream');
      mockTimer = setInterval(() => {
        // Generate 1-3 new mock events every 3-8 seconds
        const eventCount = Math.floor(Math.random() * 3) + 1;
        const newEvents = [];
        for (let i = 0; i < eventCount; i++) {
          newEvents.push(generateMockEvent());
        }
        upsertEvents(newEvents);
      }, 3000 + Math.random() * 5000);
    };

    const startPollIfEnabled = () => {
      if (!ENABLE_POLL_FALLBACK || pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          if (USE_MOCK_DATA) {
            // Generate new mock events for polling fallback
            const newEvents = [generateMockEvent()];
            upsertEvents(newEvents);
            return;
          }
          const res = await fetch(EVENTS_API, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
          if (!res.ok) return;
          const data = await res.json();
          const list = Array.isArray(data?.events) ? data.events : [];
          if (list.length) upsertEvents(list);
        } catch {}
      }, 8000);
    };

    const bestWsUrl = (() => {
      // avoid mixed-content if your site is https:
      try {
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && EVENTS_WS.startsWith('ws:')) {
          return EVENTS_WS.replace(/^ws:/, 'wss:');
        }
      } catch {}
      return EVENTS_WS;
    })();

    const connect = () => {
      if (closed) return;
      
      if (USE_MOCK_DATA) {
        // Simulate WebSocket connection with mock data
        setStreamStatus('live');
        startMockDataStream();
        return;
      }
      
      setStreamStatus(retry === 0 ? 'connecting' : 'offline'); // show offline during backoff

      try {
        ws = new WebSocket(bestWsUrl);

        ws.onopen = () => {
          // live again
          setStreamStatus('live');
          retry = 0;
          offlineSince = 0;
          stopPoll();
          stopMockTimer();
          console.log('WebSocket connected successfully');
        };

        ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            // Handle the Luna WebSocket message format
            if (payload?.event) {
              // Single event from Luna WebSocket - wrap in array for upsertEvents
              const event = payload.event;
              // Ensure event has required fields for our system
              if (event.event_id || event.source || event.create_time) {
                upsertEvents([event]);
              }
            } else if (Array.isArray(payload?.events)) {
              // Multiple events
              upsertEvents(payload.events);
            } else if (payload && (payload.event_id || payload.source)) {
              // Direct event object - wrap in array
              upsertEvents([payload]);
            } else {
              // Possible keepalive or other message type
              console.debug('Received non-event WebSocket message:', payload);
            }
          } catch (err) {
            console.warn('Failed to parse WebSocket message:', err, 'Raw data:', e.data);
            // ignore keepalives / non-JSON
          }
        };

        ws.onclose = (e) => {
          console.log('WebSocket closed:', e.code, e.reason);
          setStreamStatus('offline');

          if (!offlineSince) offlineSince = Date.now();
          // if we've been offline for a while, optionally start polling as last resort
          if (ENABLE_POLL_FALLBACK && Date.now() - offlineSince > 15000) {
            if (USE_MOCK_DATA) {
              startMockDataStream();
            } else {
              startPollIfEnabled();
            }
          }

          const delay = Math.min(30000, 1000 * Math.pow(2, retry)) + Math.floor(Math.random() * 1000);
          retry += 1;
          if (!closed) setTimeout(connect, delay);
        };

        ws.onerror = (err) => {
          console.error('WebSocket error:', err);
          setStreamStatus('offline');
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        // immediate failure → schedule reconnect
        const delay = Math.min(30000, 1000 * Math.pow(2, retry)) + Math.floor(Math.random() * 1000);
        retry += 1;
        if (!closed) setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      closed = true;
      try { ws?.close(); } catch {}
      stopPoll();
      stopMockTimer();
    };
  }, []);

  // Manual refresh (on-demand)
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        console.log('[LiveView] Refreshing with mock data');
        const mockEvents = generateInitialMockData(20); // Generate fewer events for refresh
        upsertEvents(mockEvents);
        return;
      }

      const res = await fetch(EVENTS_API, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data?.events) ? data.events : [];
      upsertEvents(list);
    } catch (e) {
      if (USE_MOCK_DATA) {
        console.log('[LiveView] Falling back to mock data for refresh due to error');
        const mockEvents = generateInitialMockData(20);
        upsertEvents(mockEvents);
      } else {
        setError(`Failed to refresh: ${e?.message ?? e}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on selected city and search term
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Filter by city
    if (selectedCity !== 'All') {
      filtered = filtered.filter(ev => ev?.location?.city === selectedCity);
    }
    
    // Filter by search term (searches in area, source, and label)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(ev => {
        const area = (ev?.location?.area || '').toLowerCase();
        const source = (ev?.source || '').toLowerCase();
        const label = (ev?.top_match?.label || ev?.user_data || '').toLowerCase();
        return area.includes(term) || source.includes(term) || label.includes(term);
      });
    }
    
    return filtered;
  }, [events, selectedCity, searchTerm]);

  // Get unique cities for filter dropdown
  const availableCities = useMemo(() => {
    const cities = new Set(events.map(ev => ev?.location?.city).filter(Boolean));
    return ['All', ...Array.from(cities).sort()];
  }, [events]);

  const stats = useMemo(() => {
    const uniqueCameras = new Set();
    const areas = new Set();
    let latestTime = 0;

    for (const ev of filteredEvents) {
      const lat = ev?.location?.geo_position?.latitude;
      const lng = ev?.location?.geo_position?.longitude;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        uniqueCameras.add(`${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`);
      }
      const area = (ev?.location?.area || ev?.source || '').trim();
      if (area) areas.add(area);
      const whenStr = ev?.create_time || ev?.detect_time;
      const t = whenStr ? +new Date(whenStr) : 0;
      if (t > latestTime) latestTime = t;
    }

    // Add mock-specific statistics
    const highConfidenceDetections = filteredEvents.filter(e => e.top_match?.similarity > 0.9).length;
    const averageSimilarity = filteredEvents.length > 0 
      ? (filteredEvents.reduce((sum, e) => sum + (e.top_match?.similarity || 0), 0) / filteredEvents.length * 100).toFixed(1)
      : 0;
    const activeCities = new Set(filteredEvents.map(e => e.location?.city).filter(Boolean)).size;

    return {
      cameras: uniqueCameras.size,
      faces: filteredEvents.length,
      areas: areas.size,
      latest: latestTime ? new Date(latestTime).toLocaleTimeString() : '—',
      highConfidenceDetections,
      averageSimilarity,
      activeCities
    };
  }, [filteredEvents]);

  return (
    <div className={styles.dashboardWrapper}>
      {/* Mobile Menu Toggle */}
      <button
        className={`${styles.mobileMenuToggle} d-md-none`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed', top: '1rem', left: '1rem', zIndex: 1001,
          background: '#1a237e', color: 'white', border: 'none',
          borderRadius: '8px', padding: '0.5rem', fontSize: '1.25rem',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        <i className={sidebarOpen ? 'bi bi-x' : 'bi bi-list'}></i>
      </button>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        {sidebarOpen && (
          <div
            className="d-md-none"
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>
            <Image src="/safecity.jpeg" width={45} height={45} alt="Logo" />
            <span>SafeCity Admin</span>
          </div>
        </div>
        <div className="p-3">
          <div className="mb-4">
            <div className={styles.navSection}>
              <h6 className={styles.navSectionTitle}>Main</h6>
              <ul className="nav flex-column">
                <li className="nav-item mb-2">
                  <Link href="/" className={styles.navItem}>
                    <i className={`bi bi-house-door ${styles.navIcon}`}></i> Home
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/dashboard" className={styles.navItem}>
                    <i className={`bi bi-speedometer2 ${styles.navIcon}`}></i> Dashboard
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/streams" className={styles.navItem}>
                    <i className={`bi bi-camera-video ${styles.navIcon}`}></i> Streams
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/zone" className={styles.navItem}>
                    <i className={`bi bi-geo-alt ${styles.navIcon}`}></i> Zone
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mb-4">
            <div className={styles.navSection}>
              <h6 className={styles.navSectionTitle}>Management</h6>
              <ul className="nav flex-column">
                <li className="nav-item mb-2">
                  <Link href="/dahua-fd" className={styles.navItem}>
                    <i className={`bi bi-building ${styles.navIcon}`}></i> Dahua FD
                  </Link>
                </li>
                <li className="nav-item mb-2">
                  <Link href="/live_view" className={`${styles.navItem} ${styles.navItemActive}`}>
                    <i className={`bi bi-eye ${styles.navIcon}`}></i> Live View
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.dashboardHeader}>
          <h2 className={styles.pageTitle}>Live View</h2>
          <div className="d-flex align-items-center gap-2">
            {/* WebSocket Connection Status */}
            <div className="d-flex align-items-center me-3">
              <div 
                className={`me-2`}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: streamStatus === 'live' ? '#28a745' : streamStatus === 'connecting' ? '#ffc107' : '#dc3545'
                }}
              ></div>
              <span className="text-muted small">
                {streamStatus === 'live' ? 'Live' : streamStatus === 'connecting' ? 'Connecting...' : 'Offline'}
              </span>
            </div>
              
            <span className="text-muted me-2">
              Last updated:&nbsp;
              <span id="update-time" suppressHydrationWarning>
                {typeof window !== 'undefined' ? new Date(refreshTime).toLocaleTimeString() : ''}
              </span>
            </span>
            <button
              className={`${styles.refreshButton} d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold`}
              onClick={handleRefresh}
              disabled={loading}
              style={{
                backgroundColor: "#0d6efd",
                color: "#fff",
                border: "none",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#0b5ed7";
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#0d6efd";
              }}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

          </div>
        </div>

        {/* Map */}
        <div className="mb-3">
          <LiveViewMap events={events} />
        </div>

        {/* Statistics Cards */}
        {!loading && !error && events.length > 0 && (
          <div className={styles.statCardsRow}>
            <div className={`${styles.statCard} ${styles.statCardPrimary}`}>
              <div className={styles.statCardIcon}><i className="bi bi-camera-video"></i></div>
              <h3 className={styles.statCardTitle}>Active Cameras</h3>
              <div className={styles.statCardValue}>{stats.cameras}</div>
              <div className={styles.statCardSubtext}>{stats.activeCities} cities monitored</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardSecondary}`}>
              <div className={styles.statCardIcon}><i className="bi bi-person-check"></i></div>
              <h3 className={styles.statCardTitle}>Faces Detected</h3>
              <div className={styles.statCardValue}>{stats.faces}</div>
              <div className={styles.statCardSubtext}>{stats.highConfidenceDetections} high confidence</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardSuccess}`}>
              <div className={styles.statCardIcon}><i className="bi bi-bullseye"></i></div>
              <h3 className={styles.statCardTitle}>Avg Similarity</h3>
              <div className={styles.statCardValue}>{stats.averageSimilarity}%</div>
              <div className={styles.statCardSubtext}>{stats.areas} areas covered</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardWarning}`}>
              <div className={styles.statCardIcon}><i className="bi bi-clock"></i></div>
              <h3 className={styles.statCardTitle}>Latest Detection</h3>
              <div className={styles.statCardValue} style={{ fontSize: '14px' }}>{stats.latest}</div>
              <div className={styles.statCardSubtext}>{USE_MOCK_DATA ? 'Mock Data Active' : 'Live Data'}</div>
            </div>
          </div>
        )}

        {/* Events Table */}
        <div className={styles.tableCard}>
          <div className={styles.chartCardHeader}>
            <i className={`bi bi-table ${styles.chartCardIcon}`}></i> Events
            <div className="ms-auto d-flex align-items-center gap-3">
              <span className="text-muted small">
                {filteredEvents.length} of {events.length} events
              </span>
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="p-3 border-bottom bg-light">
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                <label className="form-label small fw-semibold mb-1">
                  <i className="bi bi-geo-alt me-1"></i>Filter by City
                </label>
                <select 
                  className="form-select form-select-sm"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  style={{
                    borderColor: '#dee2e6',
                    fontSize: '14px'
                  }}
                >
                  {availableCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label small fw-semibold mb-1">
                  <i className="bi bi-search me-1"></i>Search Events
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by area, camera, or person..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    borderColor: '#dee2e6',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label small fw-semibold mb-1 text-transparent">Actions</label>
                <button
                  className="btn btn-outline-secondary btn-sm w-100"
                  onClick={() => {
                    setSelectedCity('All');
                    setSearchTerm('');
                  }}
                  disabled={selectedCity === 'All' && !searchTerm.trim()}
                  style={{ fontSize: '12px' }}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>Clear
                </button>
              </div>
            </div>
          </div>
          
          <div className={styles.chartCardBody}>
            {loading && <p className="alert alert-info">Loading events…</p>}
            {error && <p className="alert alert-danger">{error}</p>}
            {!loading && !error && filteredEvents.length === 0 && events.length > 0 && (
              <div className="alert alert-warning mb-0">
                <i className="bi bi-funnel me-2"></i>
                No events match your current filters. Try adjusting the city filter or search term.
              </div>
            )}
            {!loading && !error && filteredEvents.length > 0 && (
              <div className="table-responsive">
                <table className="table table-striped table-bordered align-middle">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Camera (source)</th>
                      <th>Snapshot</th>
                      <th>Label</th>
                      <th>Similarity</th>
                      <th>Date/Time</th>
                      <th>City</th>
                      <th>Area</th>
                      <th>Lat</th>
                      <th>Lng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredEvents || []).map((ev, i) => {
                      const fd = Array.isArray(ev?.face_detections) && ev.face_detections.length > 0 ? ev.face_detections[0] : null;
                      const img = collectImageCandidates(ev, fd);
                      const sim = typeof ev?.top_match?.similarity === 'number' ? `${(ev.top_match.similarity * 100).toFixed(1)}%` : '—';
                      const simValue = ev?.top_match?.similarity || 0;
                      const simColor = simValue > 0.9 ? '#28a745' : simValue > 0.8 ? '#ffc107' : '#dc3545';
                      const when = ev?.create_time || fd?.detect_time || '—';
                      const city = ev?.location?.city || '—';
                      const area = ev?.location?.area || '—';
                      const lat = ev?.location?.geo_position?.latitude;
                      const lng = ev?.location?.geo_position?.longitude;

                      return (
                        <tr key={ev?.event_id || i}>
                          <td style={{ whiteSpace: 'nowrap' }}>{ev?.source || '—'}</td>
                          <td>{img ? <ImageTry urls={img} alt="snapshot" /> : <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>}</td>
                          <td>{ev?.top_match?.label || ev?.user_data || '—'}</td>
                          <td>
                            <span style={{ 
                              color: simColor, 
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: `${simColor}20`
                            }}>
                              {sim}
                            </span>
                          </td>
                          <td suppressHydrationWarning>{when && typeof window !== 'undefined' ? new Date(when).toLocaleString() : when}</td>
                          <td>{city}</td>
                          <td>{area}</td>
                          <td>{Number.isFinite(lat) ? Number(lat).toFixed(5) : '—'}</td>
                          <td>{Number.isFinite(lng) ? Number(lng).toFixed(5) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
