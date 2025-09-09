'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from '../dashboard/dashboard.module.css';
import { fetchEndpoints, getEndpointWithFallback, getWebSocketUrl, DEFAULT_ENDPOINTS } from '../../lib/endpointsUtils';
import Sidebar from '../components/Sidebar';

const LiveViewMap = dynamic(() => import('../components/LiveViewMapClient'), { ssr: false });

/* ----------------------- Dynamic Config ----------------------- */
const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://192.168.18.70:5000';

// Dynamic endpoints - will be loaded from database
let EVENTS_API = DEFAULT_ENDPOINTS.events;
let STREAMS_API = DEFAULT_ENDPOINTS.streams;
let DAHUA_API = DEFAULT_ENDPOINTS.dahua;
let EVENTS_WS = DEFAULT_ENDPOINTS.events_ws;

// Configuration will be loaded dynamically from database

// OPTIONAL: set to true to start a gentle polling fallback when WebSocket is offline for a while
const ENABLE_POLL_FALLBACK = true;

// Server availability will be detected automatically
// Mock data will only be used as fallback when server is unavailable

/* ----------------------- Mock Data Generator ----------------------- */
// Mock data constants removed - using real API data only

// Mock data generation functions removed - using real API data only

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

// Function to check if event location is null or empty
function isLocationEmpty(location) {
  if (!location) return true;
  return !location.city && !location.area && !location.district && 
         !location.street && !location.house_number && !location.geo_position;
}

// Function to merge event locations with streams data
function mergeEventLocations(events, streams) {
  if (!Array.isArray(events) || !Array.isArray(streams)) {
    return events;
  }

  // Create a map of stream names to stream data for quick lookup
  const streamMap = new Map();
  console.log(`[LocationMerge] Processing ${streams.length} streams`);
  streams.forEach(stream => {
    if (stream.name && stream.location) {
      // Trim whitespace from stream name for matching
      const trimmedName = stream.name.trim();
      streamMap.set(trimmedName, stream.location);
      console.log(`[LocationMerge] Added stream: "${trimmedName}" with location:`, stream.location);
    }
  });

  // Process events and merge locations where needed
  let mergedCount = 0;
  const result = events.map(event => {
    // Check if event location is null/empty and event has a source
    if (event.source && isLocationEmpty(event.location)) {
      console.log(`[LocationMerge] Event with source "${event.source}" has empty location, looking for match...`);
      // Look for matching stream by source name
      const matchingLocation = streamMap.get(event.source);
      if (matchingLocation) {
        console.log(`[LocationMerge] Found matching location for "${event.source}":`, matchingLocation);
        mergedCount++;
        // Create a new event object with merged location
        return {
          ...event,
          location: {
            city: matchingLocation.city,
            area: matchingLocation.area,
            district: matchingLocation.district,
            street: matchingLocation.street,
            house_number: matchingLocation.house_number,
            geo_position: matchingLocation.geo_position ? {
              latitude: matchingLocation.geo_position.latitude,
              longitude: matchingLocation.geo_position.longitude
            } : null
          }
        };
      } else {
        console.log(`[LocationMerge] No matching stream found for source "${event.source}". Available streams:`, Array.from(streamMap.keys()));
      }
    }
    return event;
  });
  
  console.log(`[LocationMerge] Merged locations for ${mergedCount} out of ${events.length} events`);
  return result;
}
// Helper function to extract user_data from the candidate with highest similarity
function getHighestSimilarityUserData(ev) {
  if (!ev?.match_result || !Array.isArray(ev.match_result)) {
    return '—';
  }

  let highestSimilarity = -1;
  let userData = '—';

  for (const matchItem of ev.match_result) {
    if (matchItem?.candidates && Array.isArray(matchItem.candidates)) {
      for (const candidate of matchItem.candidates) {
        if (candidate?.similarity > highestSimilarity && candidate?.face?.user_data) {
          highestSimilarity = candidate.similarity;
          userData = candidate.face.user_data;
        }
      }
    }
  }

  return userData;
}

function collectImageCandidates(ev, fd) {
  // Use sample_id with new base URL format instead of image_origin
  let processedImageUrl = null;
  if (fd?.sample_id) {
    // Use the new sample_id format with the specified base URL
    processedImageUrl = `http://192.168.18.70:5000/6/samples/faces/${fd.sample_id}`;
  } else if (fd?.image_origin) {
    // Fallback to image_origin if sample_id is not available
    processedImageUrl = fd.image_origin;
  } else if (fd?.image_origin === null && ev?.source) {
    // Handle null image_origin by using source field with base URL
    const sourceUrl = ev.source;
    const filename = sourceUrl.split('/').pop(); // Get the last part after the last slash
    if (filename) {
      processedImageUrl = `http://192.168.18.89:8088/${filename}`;
    }
  }

  const rawList = [
    processedImageUrl, ev?.snapshot, ev?.image, ev?.image_url, ev?.img, ev?.thumbnail,
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

/* ----------------------- OriginalSnapshot --------------------- */
function OriginalSnapshot({ faceId }) {
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!faceId) {
      setAvatarUrl(null);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    
    const fetchAvatar = async () => {
      try {
        const response = await fetch(`http://192.168.18.70:5000/6/faces/${faceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch face data');
        }
        const data = await response.json();
        if (data.avatar) {
          setAvatarUrl(`http://192.168.18.70:5000${data.avatar}`);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAvatar();
  }, [faceId]);

  if (!faceId) {
    return <span style={{ fontSize: 12, color: '#6b7280' }}>No face ID</span>;
  }

  if (loading) {
    return <span style={{ fontSize: 12, color: '#6b7280' }}>Loading...</span>;
  }

  if (error || !avatarUrl) {
    return <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>;
  }

  return (
    <img 
      src={avatarUrl} 
      alt="Original Snapshot"
      style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 6 }}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setError(true)}
    />
  );
}

/* -------------------- Live View Page ------------------ */
export default function LiveViewPage() {
  const [events, setEvents] = useState([]);
  const [streams, setStreams] = useState([]);
  const [dahuaCameras, setDahuaCameras] = useState([]);
  const [streamEvents, setStreamEvents] = useState([]); // Events that match with streams/dahua for table display
  const [loading, setLoading] = useState(true);
  const [streamsLoading, setStreamsLoading] = useState(true);
  const [dahuaLoading, setDahuaLoading] = useState(true);
  const [streamEventsLoading, setStreamEventsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamsError, setStreamsError] = useState(null);
  const [dahuaError, setDahuaError] = useState(null);
  const [streamEventsError, setStreamEventsError] = useState(null);
  const [refreshTime, setRefreshTime] = useState(Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [selectedCity, setSelectedCity] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [polygonBounds, setPolygonBounds] = useState(null);
  const [polygonFilteredEvents, setPolygonFilteredEvents] = useState([]);
  const [polygonFilteredStreams, setPolygonFilteredStreams] = useState([]);
  const [polygonFilteredDahua, setPolygonFilteredDahua] = useState([]);
  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'streams'
  const [streamsSubTab, setStreamsSubTab] = useState('luna'); // 'luna' or 'dahua' - sub-tab within streams
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPageNoLocation, setCurrentPageNoLocation] = useState(1);
  const [itemsPerPageNoLocation, setItemsPerPageNoLocation] = useState(20);
  
  // Endpoints state
  const [endpointsMap, setEndpointsMap] = useState({});
  const [endpointsLoaded, setEndpointsLoaded] = useState(false);

  // Cluster data state
  const [clusterData, setClusterData] = useState([]);
  const [showClusterData, setShowClusterData] = useState(false);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterCache, setClusterCache] = useState(new Map());

  // Handle cluster click from map
  const handleClusterClick = async (clusterDataFromMap) => {
    const cacheKey = `${activeTab}-${JSON.stringify(clusterDataFromMap.map(item => item.id || item.trackId || item.accountId).sort())}`;
    
    // Check cache first
    if (clusterCache.has(cacheKey)) {
      const cachedData = clusterCache.get(cacheKey);
      setClusterData(cachedData);
      setShowClusterData(true);
      return;
    }

    setClusterLoading(true);
    try {
      // For now, use the data directly from the map
      // In a real implementation, you might want to fetch additional details from the API
      setClusterData(clusterDataFromMap);
      setShowClusterData(true);
      
      // Cache the data
      setClusterCache(prev => new Map(prev).set(cacheKey, clusterDataFromMap));
    } catch (error) {
      console.error('Error loading cluster data:', error);
    } finally {
      setClusterLoading(false);
    }
  };

  // Clear cluster data when switching tabs or filters
  useEffect(() => {
    setShowClusterData(false);
    setClusterData([]);
  }, [activeTab, selectedCity, searchTerm, polygonBounds]);

  const eventIds = useRef(new Set()); // dedupe across updates

  // Filter events based on polygon bounds
  const filterEventsByPolygon = (eventsToFilter, bounds) => {
    if (!bounds || !eventsToFilter.length) return eventsToFilter;
    
    return eventsToFilter.filter(ev => {
      const lat = ev?.location?.geo_position?.latitude;
      const lng = ev?.location?.geo_position?.longitude;
      
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      
      // Check if point is within bounds
      return lat >= bounds.getSouth() && 
             lat <= bounds.getNorth() && 
             lng >= bounds.getWest() && 
             lng <= bounds.getEast();
    });
  };

  // Filter streams based on polygon bounds
  const filterStreamsByPolygon = (streamsToFilter, bounds) => {
    if (!bounds || !streamsToFilter.length) return streamsToFilter;
    
    return streamsToFilter.filter(stream => {
      const lat = stream?.location?.geo_position?.latitude;
      const lng = stream?.location?.geo_position?.longitude;
      
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      
      // Check if point is within bounds
      return lat >= bounds.getSouth() && 
             lat <= bounds.getNorth() && 
             lng >= bounds.getWest() && 
             lng <= bounds.getEast();
    });
  };

  // Filter Dahua cameras based on polygon bounds
  const filterDahuaByPolygon = (dahuaToFilter, bounds) => {
    if (!bounds || !dahuaToFilter.length) return dahuaToFilter;
    
    return dahuaToFilter.filter(camera => {
      const lat = camera?.lat;
      const lng = camera?.lon;
      
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      
      // Check if point is within bounds
      return lat >= bounds.getSouth() && 
             lat <= bounds.getNorth() && 
             lng >= bounds.getWest() && 
             lng <= bounds.getEast();
    });
  };

  // Handle polygon change from map
  const handlePolygonChange = (bounds) => {
    setPolygonBounds(bounds);
    const filteredEvents = filterEventsByPolygon(events, bounds);
    const filteredStreams = filterStreamsByPolygon(streams, bounds);
    const filteredDahua = filterDahuaByPolygon(dahuaCameras, bounds);
    setPolygonFilteredEvents(filteredEvents);
    setPolygonFilteredStreams(filteredStreams);
    setPolygonFilteredDahua(filteredDahua);
  };

  // Update polygon filtered events, streams, and Dahua when data changes
  useEffect(() => {
    if (polygonBounds) {
      const filteredEvents = filterEventsByPolygon(events, polygonBounds);
      const filteredStreams = filterStreamsByPolygon(streams, polygonBounds);
      const filteredDahua = filterDahuaByPolygon(dahuaCameras, polygonBounds);
      setPolygonFilteredEvents(filteredEvents);
      setPolygonFilteredStreams(filteredStreams);
      setPolygonFilteredDahua(filteredDahua);
    } else {
      setPolygonFilteredEvents(events);
      setPolygonFilteredStreams(streams);
      setPolygonFilteredDahua(dahuaCameras);
    }
  }, [events, streams, dahuaCameras, polygonBounds]);

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

  // Function to update stream events with new incoming events that match streams/dahua
  const updateStreamEventsFromNewEvents = (newEvents) => {
    if (!Array.isArray(newEvents) || newEvents.length === 0) return;
    
    // Filter new events that match with streams or dahua cameras
    const matchedNewEvents = newEvents.filter(event => {
      // For Luna streams: match event.source with stream.name
      const matchesLunaStream = event.source && streams.some(stream => stream.name === event.source);
      
      // For Dahua cameras: match event.track_id with camera.track_id
      const matchesDahuaCamera = event.track_id && dahuaCameras.some(camera => camera.track_id === event.track_id);
      
      return matchesLunaStream || matchesDahuaCamera;
    });
    
    if (matchedNewEvents.length > 0) {
      console.log(`[LiveView] Adding ${matchedNewEvents.length} new matching events to stream events`);
      
      // Clear cluster cache when new events arrive to ensure fresh data in popups
      setClusterCache(new Map());
      
      setStreamEvents(prevStreamEvents => {
        // Create a set of existing event IDs to avoid duplicates
        const existingEventIds = new Set(prevStreamEvents.map(event => 
          event.event_id || `${event.source}-${event.create_time}`
        ));
        
        // Filter out events that already exist
        const newUniqueEvents = matchedNewEvents.filter(event => {
          const eventKey = event.event_id || `${event.source}-${event.create_time}`;
          return !existingEventIds.has(eventKey);
        });
        
        if (newUniqueEvents.length > 0) {
          // Add new events to the beginning (newest first) and cap the total
          return [...newUniqueEvents, ...prevStreamEvents].slice(0, 500);
        }
        
        return prevStreamEvents;
      });
    }
  };

  // Enhanced upsert function that applies location merging and updates stream events
  const upsertEventsWithLocationMerge = (incoming, streamsData) => {
    const list = Array.isArray(incoming) ? incoming : [incoming];
    if (!list.length) return;

    // Debug: Log events with NTS_Office_05 source
    const ntsEvents = list.filter(event => event.source === 'NTS_Office_05');
    if (ntsEvents.length > 0) {
      console.log(`[DEBUG] Found ${ntsEvents.length} events with source "NTS_Office_05":`, ntsEvents.map(e => ({ source: e.source, location: e.location })));
    }

    // Apply location merging before upserting
    const mergedEvents = mergeEventLocations(list, streamsData || streams);
    
    // Debug: Check if NTS_Office_05 events got location after merging
    const mergedNtsEvents = mergedEvents.filter(event => event.source === 'NTS_Office_05');
    if (mergedNtsEvents.length > 0) {
      console.log(`[DEBUG] After merging, NTS_Office_05 events:`, mergedNtsEvents.map(e => ({ source: e.source, location: e.location })));
    }
    
    upsertEvents(mergedEvents);
    
    // Update stream events with new matching events
    updateStreamEventsFromNewEvents(mergedEvents);
  };

  // Back command functionality - restore from backup
  useEffect(() => {
    const handleBackCommand = (event) => {
      if (event.data === 'Back' && event.origin === window.location.origin) {
        // This is a placeholder for the back command functionality
        // In a real implementation, you would restore the backup file
        console.log('Back command received - would restore backup file');
        // window.location.reload(); // Simple approach to reload with original code
      }
    };

    window.addEventListener('message', handleBackCommand);
    return () => window.removeEventListener('message', handleBackCommand);
  }, []);

  // State to track data source
  const [dataSource, setDataSource] = useState('checking'); // 'real', 'mock', 'checking'
  const [streamsDataSource, setStreamsDataSource] = useState('checking'); // 'real', 'mock', 'checking'
  const [dahuaDataSource, setDahuaDataSource] = useState('checking'); // 'real', 'mock', 'checking'

  // Function to check server health
  const checkServerHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const res = await fetch(EVENTS_API, { 
        cache: 'no-store', 
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return res.ok;
    } catch (e) {
      console.log('[LiveView] Server health check failed:', e.message);
      return false;
    }
  };

  // Function to load data from either real or mock API
  const loadData = async (useMock = false) => {
    try {
      const apiUrl = useMock ? '/api/mock/events' : EVENTS_API;
      console.log(`[LiveView] Loading ${useMock ? 'mock' : 'real'} data from ${apiUrl}...`);
      
      const res = await fetch(apiUrl, { 
        cache: 'no-store', 
        headers: { 'Cache-Control': 'no-cache' } 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      console.log(`[LiveView] Loaded ${data?.events?.length || 0} ${useMock ? 'mock' : 'real'} events`);
      
      const initial = Array.isArray(data?.events) ? data.events : [];
      // reverse so newest ends up first after unshift ordering
      upsertEventsWithLocationMerge(initial.reverse(), streams);
      setDataSource(useMock ? 'mock' : 'real');
      setError(null);
      
      return true;
    } catch (e) {
      console.error(`[LiveView] Error loading ${useMock ? 'mock' : 'real'} data:`, e.message);
      if (!useMock) {
        setError(`Server unavailable (${e.message}). Switching to mock data...`);
      } else {
        setError(`Failed to load data: ${e.message}`);
      }
      return false;
    }
  };

  // Function to load streams data from either real or mock API
  const loadStreamsData = async (useMock = false) => {
    try {
      const apiUrl = useMock ? '/api/mock/streams' : STREAMS_API;
      console.log(`[LiveView] Loading ${useMock ? 'mock' : 'real'} streams data from ${apiUrl}...`);
      
      const res = await fetch(apiUrl, { 
        cache: 'no-store', 
        headers: { 'Cache-Control': 'no-cache' } 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      console.log(`[LiveView] Loaded ${data?.streams?.length || 0} ${useMock ? 'mock' : 'real'} streams`);
      
      const streamsList = Array.isArray(data?.streams) ? data.streams : [];
      setStreams(streamsList);
      setStreamsDataSource(useMock ? 'mock' : 'real');
      setStreamsError(null);
      
      return true;
    } catch (e) {
      console.error(`[LiveView] Error loading ${useMock ? 'mock' : 'real'} streams data:`, e.message);
      if (!useMock) {
        setStreamsError(`Server unavailable (${e.message}). Switching to mock data...`);
      } else {
        setStreamsError(`Failed to load streams data: ${e.message}`);
      }
      return false;
    }
  };

  // Function to load Dahua cameras data from either real or mock API
  const loadDahuaData = async (useMock = false) => {
    try {
      const apiUrl = useMock ? '/api/mock/dahua' : DAHUA_API;
      console.log(`[LiveView] Loading ${useMock ? 'mock' : 'real'} Dahua cameras data from ${apiUrl}...`);
      
      const res = await fetch(apiUrl, { 
        cache: 'no-store', 
        headers: { 'Cache-Control': 'no-cache' } 
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      console.log(`[LiveView] Loaded ${data?.items?.length || 0} ${useMock ? 'mock' : 'real'} Dahua cameras`);
      
      // Dahua API returns object with 'items' array
      const camerasList = Array.isArray(data?.items) ? data.items : [];
      // Sort by created_at (latest first)
      const sortedCameras = camerasList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setDahuaCameras(sortedCameras);
      setDahuaDataSource(useMock ? 'mock' : 'real');
      setDahuaError(null);
      
      return true;
    } catch (e) {
      console.error(`[LiveView] Error loading ${useMock ? 'mock' : 'real'} Dahua cameras data:`, e.message);
      if (!useMock) {
        setDahuaError(`Server unavailable (${e.message}). Switching to mock data...`);
      } else {
        setDahuaError(`Failed to load Dahua cameras data: ${e.message}`);
      }
      return false;
    }
  };

  // Function to load stream events (events that match with streams/dahua for table display)
  const loadStreamEventsData = async (useMock = false) => {
    try {
      // First, try to get events from API
      const apiUrl = useMock ? '/api/mock/events' : getEndpointWithFallback('stream_events_direct', endpointsMap, 'http://192.168.18.70:5000/6/events?page=1&page_size=900');
      console.log(`[LiveView] Loading ${useMock ? 'mock' : 'real'} stream events data from ${apiUrl}...`);
      
      let eventsList = [];
      
      try {
        const res = await fetch(apiUrl, { 
          cache: 'no-store', 
          headers: { 'Cache-Control': 'no-cache' } 
        });
        
        if (res.ok) {
          const data = await res.json();
          eventsList = Array.isArray(data?.events) ? data.events : [];
          console.log(`[LiveView] Loaded ${eventsList.length} ${useMock ? 'mock' : 'real'} events from API`);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (apiError) {
        console.log(`[LiveView] API failed, using existing events data:`, apiError.message);
        // If API fails, use the existing events data
        eventsList = events;
      }
      
      // Debug logging for matching logic
      console.log(`[LiveView] Filtering ${eventsList.length} events against ${streams.length} streams and ${dahuaCameras.length} dahua cameras`);
      
      if (streams.length > 0) {
        console.log('[LiveView] Sample stream names:', streams.slice(0, 3).map(s => s.name));
      }
      if (dahuaCameras.length > 0) {
        console.log('[LiveView] Sample dahua track_ids:', dahuaCameras.slice(0, 3).map(c => c.track_id));
      }
      if (eventsList.length > 0) {
        console.log('[LiveView] Sample event sources:', eventsList.slice(0, 3).map(e => e.source));
        console.log('[LiveView] Sample event track_ids:', eventsList.slice(0, 3).map(e => e.track_id));
      }
      
      // Filter events that match with streams or dahua cameras
      const matchedEvents = eventsList.filter(event => {
        // For Luna streams: match event.source with stream.name
        const matchesLunaStream = event.source && streams.some(stream => stream.name === event.source);
        
        // For Dahua cameras: match event.track_id with camera.track_id
        const matchesDahuaCamera = event.track_id && dahuaCameras.some(camera => camera.track_id === event.track_id);
        
        return matchesLunaStream || matchesDahuaCamera;
      });
      
      console.log(`[LiveView] Found ${matchedEvents.length} events matching streams/dahua cameras`);
      
      setStreamEvents(matchedEvents);
      setStreamEventsError(null);
      
      return true;
    } catch (e) {
      console.error(`[LiveView] Error loading ${useMock ? 'mock' : 'real'} stream events data:`, e.message);
      if (!useMock) {
        setStreamEventsError(`Server unavailable (${e.message}). Switching to mock data...`);
      } else {
        setStreamEventsError(`Failed to load stream events data: ${e.message}`);
      }
      return false;
    }
  };

  // Load endpoints from database
  useEffect(() => {
    const loadEndpoints = async () => {
      try {
        const result = await fetchEndpoints();
        if (result.success) {
          setEndpointsMap(result.endpoints);
          
          // Update global API URLs with dynamic endpoints
          EVENTS_API = getEndpointWithFallback('events', result.endpoints);
          STREAMS_API = getEndpointWithFallback('streams', result.endpoints);
          DAHUA_API = getEndpointWithFallback('dahua', result.endpoints);
          EVENTS_WS = getWebSocketUrl(result.endpoints, BASE) || DEFAULT_ENDPOINTS.events_ws;
          
          console.log('[LiveView] Loaded dynamic endpoints:', {
            events: EVENTS_API,
            streams: STREAMS_API,
            dahua: DAHUA_API,
            streamEvents: getEndpointWithFallback('stream_events_direct', result.endpoints, 'http://192.168.18.70:5000/6/events?page=1&page_size=900'),
            websocket: EVENTS_WS
          });
        } else {
          console.warn('[LiveView] Failed to load endpoints, using defaults:', result.error);
        }
      } catch (error) {
        console.error('[LiveView] Error loading endpoints:', error);
      } finally {
        setEndpointsLoaded(true);
      }
    };
    
    loadEndpoints();
  }, []);

  // Initial load with fallback mechanism
  useEffect(() => {
    if (!endpointsLoaded) return; // Wait for endpoints to load first
    
    let cancelled = false;
    
    (async () => {
      if (cancelled) return;
      
      // Load events data
      const realDataLoaded = await loadData(false);
      
      if (!realDataLoaded && !cancelled) {
        console.log('[LiveView] Falling back to mock events data...');
        await loadData(true);
      }
      
      // Load streams data
      const realStreamsLoaded = await loadStreamsData(false);
      
      if (!realStreamsLoaded && !cancelled) {
        console.log('[LiveView] Falling back to mock streams data...');
        await loadStreamsData(true);
      }
      
      // Load Dahua cameras data
      const realDahuaLoaded = await loadDahuaData(false);
      
      if (!realDahuaLoaded && !cancelled) {
        console.log('[LiveView] Falling back to mock Dahua cameras data...');
        await loadDahuaData(true);
      }
      
      if (!cancelled) {
        setLoading(false);
        setStreamsLoading(false);
        setDahuaLoading(false);
        setStreamEventsLoading(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [endpointsLoaded]);

  // Load stream events when streams or dahua data changes
  useEffect(() => {
    if (streamsLoading || dahuaLoading) {
      return; // Wait for both streams and dahua data loading to complete
    }
    
    // Only proceed if we have at least one data source (streams OR dahua)
    if (streams.length === 0 && dahuaCameras.length === 0) {
      console.log('[LiveView] No streams or dahua cameras available, skipping stream events load');
      setStreamEventsLoading(false);
      return;
    }

    let cancelled = false;
    
    (async () => {
      if (cancelled) return;
      
      setStreamEventsLoading(true);
      
      // Load stream events data
      const realStreamEventsLoaded = await loadStreamEventsData(false);
      
      if (!realStreamEventsLoaded && !cancelled) {
        console.log('[LiveView] Falling back to mock stream events data...');
        await loadStreamEventsData(true);
      }
      
      if (!cancelled) {
        setStreamEventsLoading(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [streams, dahuaCameras, streamsLoading, dahuaLoading]);

  // ---------- WebSocket with exponential backoff ----------
  useEffect(() => {
    let ws = null;
    let closed = false;
    let retry = 0;
    let pollTimer = null;
    let offlineSince = 0;

    const stopPoll = () => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } };

    const startPollIfEnabled = () => {
      if (!ENABLE_POLL_FALLBACK || pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(EVENTS_API, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
          if (!res.ok) return;
          const data = await res.json();
          const list = Array.isArray(data?.events) ? data.events : [];
          if (list.length) upsertEventsWithLocationMerge(list, streams);
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
      
      setStreamStatus(retry === 0 ? 'connecting' : 'offline'); // show offline during backoff

      try {
        ws = new WebSocket(bestWsUrl);

        ws.onopen = () => {
          // live again
          setStreamStatus('live');
          retry = 0;
          offlineSince = 0;
          stopPoll();
          console.log('WebSocket connected successfully');
        };

        ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            // Handle the Luna WebSocket message format
            if (payload?.event) {
              // Single event from Luna WebSocket - wrap in array for upsertEventsWithLocationMerge
              const event = payload.event;
              // Ensure event has required fields for our system
              if (event.event_id || event.source || event.create_time) {
                upsertEventsWithLocationMerge([event], streams);
              }
            } else if (Array.isArray(payload?.events)) {
              // Multiple events
              upsertEventsWithLocationMerge(payload.events, streams);
            } else if (payload && (payload.event_id || payload.source)) {
              // Direct event object - wrap in array
              upsertEventsWithLocationMerge([payload], streams);
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
            startPollIfEnabled();
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
    };
  }, []); // Connect once on mount

  // Manual refresh with fallback mechanism
  const handleRefresh = async () => {
    setLoading(true);
    setStreamsLoading(true);
    setDahuaLoading(true);
    setError(null);
    setStreamsError(null);
    setDahuaError(null);
    
    // Clear existing data for fresh load
    setEvents([]);
    setStreams([]);
    setDahuaCameras([]);
    eventIds.current.clear();
    
    // Try real events data first, fallback to mock if needed
    const realDataLoaded = await loadData(false);
    
    if (!realDataLoaded) {
      console.log('[LiveView] Refresh falling back to mock events data...');
      await loadData(true);
    }
    
    // Try real streams data first, fallback to mock if needed
    const realStreamsLoaded = await loadStreamsData(false);
    
    if (!realStreamsLoaded) {
      console.log('[LiveView] Refresh falling back to mock streams data...');
      await loadStreamsData(true);
    }
    
    // Try real Dahua data first, fallback to mock if needed
    const realDahuaLoaded = await loadDahuaData(false);
    
    if (!realDahuaLoaded) {
      console.log('[LiveView] Refresh falling back to mock Dahua cameras data...');
      await loadDahuaData(true);
    }
    
    setLoading(false);
    setStreamsLoading(false);
    setDahuaLoading(false);
  };

  // Filter events based on polygon, selected city and search term
  const filteredEvents = useMemo(() => {
    let filtered = polygonFilteredEvents.filter(ev => !isLocationEmpty(ev.location)); // Only events with location
    
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
  }, [polygonFilteredEvents, selectedCity, searchTerm]);

  // Filter events without location
  const eventsWithoutLocation = useMemo(() => {
    let filtered = polygonFilteredEvents.filter(ev => isLocationEmpty(ev.location)); // Only events without location
    
    // Filter by search term (searches in source and label only since no location data)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(ev => {
        const source = (ev?.source || '').toLowerCase();
        const label = (ev?.top_match?.label || ev?.user_data || '').toLowerCase();
        return source.includes(term) || label.includes(term);
      });
    }
    
    return filtered;
  }, [polygonFilteredEvents, searchTerm]);

  // Paginated events - use cluster data if available
  const paginatedEvents = useMemo(() => {
    const dataToUse = showClusterData ? clusterData : filteredEvents;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataToUse.slice(startIndex, endIndex);
  }, [filteredEvents, clusterData, showClusterData, currentPage, itemsPerPage]);

  // Paginated events without location
  const paginatedEventsNoLocation = useMemo(() => {
    const startIndex = (currentPageNoLocation - 1) * itemsPerPageNoLocation;
    const endIndex = startIndex + itemsPerPageNoLocation;
    return eventsWithoutLocation.slice(startIndex, endIndex);
  }, [eventsWithoutLocation, currentPageNoLocation, itemsPerPageNoLocation]);

  // Calculate total pages - use cluster data if available
  const totalPages = Math.ceil((showClusterData ? clusterData.length : filteredEvents.length) / itemsPerPage);
  const totalPagesNoLocation = Math.ceil(eventsWithoutLocation.length / itemsPerPageNoLocation);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCurrentPageNoLocation(1);
  }, [selectedCity, searchTerm, polygonBounds]);

  // Filter streams based on polygon, selected city and search term
  const filteredStreams = useMemo(() => {
    let filtered = polygonFilteredStreams; // Use polygon-filtered streams as base
    
    // Filter by city
    if (selectedCity !== 'All') {
      filtered = filtered.filter(stream => stream?.location?.city === selectedCity);
    }
    
    // Filter by search term (searches in area, name, and account_id)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(stream => {
        const area = (stream?.location?.area || '').toLowerCase();
        const name = (stream?.name || '').toLowerCase();
        const accountId = (stream?.account_id || '').toLowerCase();
        return area.includes(term) || name.includes(term) || accountId.includes(term);
      });
    }
    
    return filtered;
  }, [polygonFilteredStreams, selectedCity, searchTerm]);

  // Filter Dahua cameras based on polygon, selected city and search term
  const filteredDahua = useMemo(() => {
    let filtered = polygonFilteredDahua; // Use polygon-filtered Dahua as base
    
    // Filter by city
    if (selectedCity !== 'All') {
      filtered = filtered.filter(camera => camera?.city === selectedCity);
    }
    
    // Filter by search term (searches in camera_name, track_id, area, district, street)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(camera => {
        const cameraName = (camera?.camera_name || '').toLowerCase();
        const trackId = (camera?.track_id || '').toLowerCase();
        const area = (camera?.area || '').toLowerCase();
        const district = (camera?.district || '').toLowerCase();
        const street = (camera?.street || '').toLowerCase();
        return cameraName.includes(term) || trackId.includes(term) || area.includes(term) || district.includes(term) || street.includes(term);
      });
    }
    
    return filtered;
  }, [polygonFilteredDahua, selectedCity, searchTerm]);

  // Filter stream events based on selected city, search term, and sub-tab
  const filteredStreamEvents = useMemo(() => {
    let filtered = streamEvents;
    
    // Filter by city
    if (selectedCity !== 'All') {
      filtered = filtered.filter(event => event?.location?.city === selectedCity);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(event => {
        const source = (event?.source || '').toLowerCase();
        const label = (event?.top_match?.label || event?.user_data || '').toLowerCase();
        return source.includes(term) || label.includes(term);
      });
    }
    
    // Filter by sub-tab (Luna vs Dahua)
    if (streamsSubTab === 'luna') {
      // Show only events that match Luna streams
      filtered = filtered.filter(event => {
        return streams.some(stream => stream.name === event.source);
      });
    } else if (streamsSubTab === 'dahua') {
      // Show only events that match Dahua cameras
      filtered = filtered.filter(event => {
        return dahuaCameras.some(camera => camera.track_id === event.track_id);
      });
    }
    
    return filtered;
  }, [streamEvents, selectedCity, searchTerm, streamsSubTab, streams, dahuaCameras]);

  // Filter stream events for cluster when active
  const clusterFilteredStreamEvents = useMemo(() => {
    if (!showClusterData) return filteredStreamEvents;
    
    return filteredStreamEvents.filter(event => {
      const lat = event?.location?.geo_position?.latitude;
      const lng = event?.location?.geo_position?.longitude;
      
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      
      // Check if event is within any of the cluster data points
      return clusterData.some(clusterEvent => {
        const clusterLat = clusterEvent?.location?.geo_position?.latitude;
        const clusterLng = clusterEvent?.location?.geo_position?.longitude;
        
        if (!Number.isFinite(clusterLat) || !Number.isFinite(clusterLng)) return false;
        
        // Consider events within a small radius as part of the same cluster
        const latDiff = Math.abs(lat - clusterLat);
        const lngDiff = Math.abs(lng - clusterLng);
        return latDiff < 0.001 && lngDiff < 0.001; // ~100m radius
      });
    });
  }, [filteredStreamEvents, clusterData, showClusterData]);

  // Paginated stream events - use cluster data if available
  const paginatedStreamEvents = useMemo(() => {
    const dataToUse = showClusterData ? clusterFilteredStreamEvents : filteredStreamEvents;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return dataToUse.slice(startIndex, endIndex);
  }, [clusterFilteredStreamEvents, filteredStreamEvents, showClusterData, currentPage, itemsPerPage]);

  // Get unique cities for filter dropdown
  const availableCities = useMemo(() => {
    const eventCities = events.map(ev => ev?.location?.city).filter(Boolean);
    const streamCities = streams.map(stream => stream?.location?.city).filter(Boolean);
    const dahuaCities = dahuaCameras.map(camera => camera?.city).filter(Boolean);
    const cities = new Set([...eventCities, ...streamCities, ...dahuaCities]);
    return ['All', ...Array.from(cities).sort()];
  }, [events, streams, dahuaCameras]);

  const stats = useMemo(() => {
    const uniqueCameras = new Set();
    const areas = new Set();
    let latestTime = 0;

    // Process events
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

    // Process streams
    for (const stream of filteredStreams) {
      const lat = stream?.location?.geo_position?.latitude;
      const lng = stream?.location?.geo_position?.longitude;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        uniqueCameras.add(`${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`);
      }
      const area = (stream?.location?.area || '').trim();
      if (area) areas.add(area);
      const whenStr = stream?.create_time;
      const t = whenStr ? +new Date(whenStr) : 0;
      if (t > latestTime) latestTime = t;
    }

    // Events-specific statistics
    const highConfidenceDetections = filteredEvents.filter(e => e.top_match?.similarity > 0.9).length;
    const averageSimilarity = filteredEvents.length > 0 
      ? (filteredEvents.reduce((sum, e) => sum + (e.top_match?.similarity || 0), 0) / filteredEvents.length * 100).toFixed(1)
      : 0;
    
    // Streams-specific statistics
    const activeStreams = filteredStreams.filter(s => s.status === 'active').length;
    const totalStreams = filteredStreams.length;
    
    // Combined statistics
    const activeCities = new Set([...filteredEvents.map(e => e.location?.city), ...filteredStreams.map(s => s.location?.city)].filter(Boolean)).size;

    return {
      cameras: uniqueCameras.size,
      faces: filteredEvents.length,
      streams: totalStreams,
      activeStreams,
      areas: areas.size,
      latest: latestTime ? new Date(latestTime).toLocaleTimeString() : '—',
      highConfidenceDetections,
      averageSimilarity,
      activeCities
    };
  }, [filteredEvents, filteredStreams]);

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
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

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
            
            {/* Data Source Indicators */}
            <div className="d-flex align-items-center me-3">
              <div 
                className={`me-2`}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: dataSource === 'real' ? '#28a745' : dataSource === 'mock' ? '#ffc107' : '#6c757d'
                }}
              ></div>
              <span className="text-muted small">
                Events: {dataSource === 'real' ? 'Real' : dataSource === 'mock' ? 'Mock' : 'Loading...'}
              </span>
            </div>
            

            <div className="d-flex align-items-center me-3">
              <div 
                className={`me-2`}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: streamsDataSource === 'real' ? '#28a745' : streamsDataSource === 'mock' ? '#ffc107' : '#6c757d'
                }}
              ></div>
              <span className="text-muted small">
                Streams: {streamsDataSource === 'real' ? 'Real' : streamsDataSource === 'mock' ? 'Mock' : 'Loading...'}
              </span>
            </div>
            <div className="d-flex align-items-center me-3">
              <div 
                className={`me-2`}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: dahuaDataSource === 'real' ? '#28a745' : dahuaDataSource === 'mock' ? '#ffc107' : '#6c757d'
                }}
              ></div>
              <span className="text-muted small">
                Dahua: {dahuaDataSource === 'real' ? 'Real' : dahuaDataSource === 'mock' ? 'Mock' : 'Loading...'}
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
          <LiveViewMap 
            events={activeTab === 'events' ? polygonFilteredEvents : []}
            streams={activeTab === 'streams' ? polygonFilteredStreams : []}
            dahua={activeTab === 'streams' ? polygonFilteredDahua : []}
            realTimeStreamEvents={streamEvents}
            onPolygonChange={handlePolygonChange}
            streamStatus={streamStatus}
            activeTab={activeTab}
            streamsSubTab={streamsSubTab}
            onClusterClick={handleClusterClick}
          />
        </div>

        {/* Statistics Cards */}
        {!loading && !streamsLoading && !dahuaLoading && !error && !streamsError && !dahuaError && (events.length > 0 || streams.length > 0 || dahuaCameras.length > 0) && (
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
              <div className={styles.statCardIcon}><i className="bi bi-broadcast"></i></div>
              <h3 className={styles.statCardTitle}>Active Streams</h3>
              <div className={styles.statCardValue}>{stats.activeStreams}/{stats.streams}</div>
              <div className={styles.statCardSubtext}>{stats.areas} areas covered</div>
            </div>
            <div className={`${styles.statCard} ${styles.statCardWarning}`}>
              <div className={styles.statCardIcon}><i className="bi bi-clock"></i></div>
              <h3 className={styles.statCardTitle}>Latest Activity</h3>
              <div className={styles.statCardValue} style={{ fontSize: '14px' }}>{stats.latest}</div>
              <div className={styles.statCardSubtext}>Live Data</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className={`mb-3 ${styles.tabNavigation}`}>
          <div className="d-flex gap-2">
            <button 
              className={`btn ${activeTab === 'events' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center gap-2`}
              onClick={() => setActiveTab('events')}
            >
              <i className="bi bi-camera-video"></i>
              Events ({filteredEvents.length})
              {eventsWithoutLocation.length > 0 && (
                <span className="badge bg-warning text-dark ms-1" title="Events without location">
                  +{eventsWithoutLocation.length}
                </span>
              )}
            </button>
            <button 
              className={`btn ${activeTab === 'streams' ? 'btn-primary' : 'btn-outline-primary'} d-flex align-items-center gap-2`}
              onClick={() => setActiveTab('streams')}
            >
              <i className="bi bi-broadcast"></i>
              Streams ({filteredStreams.length + filteredDahua.length})
            </button>
          </div>
          
          {/* Streams Sub-tabs */}
          {activeTab === 'streams' && (
            <div className="mt-2">
              <div className="d-flex gap-2">
                <button 
                  className={`btn btn-sm ${streamsSubTab === 'luna' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center gap-2`}
                  onClick={() => setStreamsSubTab('luna')}
                >
                  <i className="bi bi-broadcast"></i>
                  Luna Streams ({filteredStreams.length})
                </button>
                <button 
                  className={`btn btn-sm ${streamsSubTab === 'dahua' ? 'btn-success' : 'btn-outline-success'} d-flex align-items-center gap-2`}
                  onClick={() => setStreamsSubTab('dahua')}
                >
                  <i className="bi bi-camera"></i>
                  Dahua Cameras ({filteredDahua.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Events/Streams Table */}
        <div className={styles.tableCard}>
          <div className={styles.chartCardHeader}>
            <i className={`bi bi-table ${styles.chartCardIcon}`}></i> {activeTab === 'events' ? 'Events' : activeTab === 'streams' ? (streamsSubTab === 'luna' ? 'Luna Streams' : 'Dahua Cameras') : 'Data'}
            <div className="ms-auto d-flex align-items-center gap-3">
              <span className="text-muted small">
                {activeTab === 'events' 
                  ? `${filteredEvents.length} with location${eventsWithoutLocation.length > 0 ? ` + ${eventsWithoutLocation.length} without location` : ''} of ${polygonFilteredEvents.length} in polygon (${events.length} total)`
                  : activeTab === 'streams'
                  ? `${filteredStreamEvents.length} events matching ${streamsSubTab === 'luna' ? 'Luna streams' : 'Dahua cameras'} (${streamEvents.length} total stream events)`
                  : ''
                }
              </span>
              {polygonBounds && (
                <span className="badge bg-success">
                  <i className="bi bi-geo-alt me-1"></i>Polygon Filter Active
                </span>
              )}
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="p-3 border-bottom bg-light">
            <div className="row g-3 align-items-center">
              <div className="col-md-4 col-12">
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
              <div className="col-md-6 col-12">
                <label className="form-label small fw-semibold mb-1">
                  <i className="bi bi-search me-1"></i>Search Events
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={activeTab === 'events' ? 'Search by area, camera, or person...' : activeTab === 'streams' && streamsSubTab === 'luna' ? 'Search by area, name, or account...' : activeTab === 'streams' && streamsSubTab === 'dahua' ? 'Search by camera name, area, or city...' : 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    borderColor: '#dee2e6',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div className="col-md-2 col-12">
                <label className="form-label small fw-semibold mb-1 d-md-block d-none text-transparent">Actions</label>
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
            {activeTab === 'events' ? (
              // Events Table
              <>
                {(loading || clusterLoading) && <p className="alert alert-info">{clusterLoading ? 'Loading cluster data…' : 'Loading events…'}</p>}
                {error && <p className="alert alert-danger">{error}</p>}
                {!loading && !error && filteredEvents.length === 0 && events.length > 0 && (
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-funnel me-2"></i>
                    No events match your current filters. Try adjusting the city filter or search term.
                  </div>
                )}
                {!loading && !error && (showClusterData ? clusterData.length > 0 : filteredEvents.length > 0) && (
                  <>
                    {showClusterData && (
                      <div className="alert alert-info mx-3 mb-3 d-flex justify-content-between align-items-center">
                        <div>
                          <i className="bi bi-collection me-2"></i>
                          <strong>Cluster View:</strong> Showing {clusterData.length} items from selected cluster
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => {
                            setShowClusterData(false);
                            setClusterData([]);
                            setCurrentPage(1);
                          }}
                        >
                          <i className="bi bi-arrow-left me-1"></i>Back to All Data
                        </button>
                      </div>
                    )}
                    <div className="d-flex justify-content-between align-items-center mb-3 px-3">
                      <div className="text-muted small">
                        {showClusterData ? (
                          <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, clusterData.length)} of {clusterData.length} cluster items</>
                        ) : (
                          <>Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} events</>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <label className="form-label small mb-0">Items per page:</label>
                        <select 
                          className="form-select form-select-sm" 
                          style={{ width: 'auto' }}
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-striped table-bordered align-middle">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ whiteSpace: 'nowrap' }}>Camera (source)</th>
                            <th>Detected Image</th>
                            <th>Original Image</th>
                            <th>Label</th>
                            <th>Name</th>
                            <th>Similarity</th>
                            <th>Date/Time</th>
                            <th>City</th>
                            <th>Area</th>
                            <th>Lat</th>
                            <th>Lng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(paginatedEvents || []).map((ev, i) => {
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
                          const userData = getHighestSimilarityUserData(ev);

                          return (
                            <tr key={ev?.event_id || i}>
                              <td style={{ whiteSpace: 'nowrap' }}>{ev?.source || '—'}</td>
                              <td>{img ? <ImageTry urls={img} alt="snapshot" /> : <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>}</td>
                              <td><OriginalSnapshot faceId={ev?.top_match?.face_id} /></td>
                              <td>{ev?.top_match?.label || ev?.user_data || '—'}</td>
                              <td>{userData}</td>
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
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3 px-3">
                      <div className="text-muted small">
                        Page {currentPage} of {totalPages}
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                            >
                              First
                            </button>
                          </li>
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {/* Page numbers */}
                          {(() => {
                            const pages = [];
                            const startPage = Math.max(1, currentPage - 2);
                            const endPage = Math.min(totalPages, currentPage + 2);
                            
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => setCurrentPage(i)}
                                  >
                                    {i}
                                  </button>
                                </li>
                              );
                            }
                            return pages;
                          })()}
                          
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </li>
                          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                            >
                              Last
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
                
                {/* Location Not Found Section */}
                {!loading && !error && eventsWithoutLocation.length > 0 && (
                  <>
                    <div className="mt-4 mb-3">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <i className="bi bi-exclamation-triangle text-warning"></i>
                        <h5 className="mb-0 text-warning">Location Not Found</h5>
                        <span className="badge bg-warning text-dark">{eventsWithoutLocation.length}</span>
                      </div>
                      <div className="alert alert-warning mb-3">
                        <i className="bi bi-info-circle me-2"></i>
                        These events are received but cannot be displayed on the map due to missing location data.
                      </div>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3 px-3">
                      <div className="text-muted small">
                        Showing {((currentPageNoLocation - 1) * itemsPerPageNoLocation) + 1} to {Math.min(currentPageNoLocation * itemsPerPageNoLocation, eventsWithoutLocation.length)} of {eventsWithoutLocation.length} events without location
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <label className="form-label small mb-0">Items per page:</label>
                        <select 
                          className="form-select form-select-sm" 
                          style={{ width: 'auto' }}
                          value={itemsPerPageNoLocation}
                          onChange={(e) => {
                            setItemsPerPageNoLocation(Number(e.target.value));
                            setCurrentPageNoLocation(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="table-responsive">
                      <table className="table table-striped table-bordered align-middle">
                        <thead className="table-warning">
                          <tr>
                            <th style={{ whiteSpace: 'nowrap' }}>Camera (source)</th>
                            <th>Snapshot</th>
                            <th>Original Snapshot</th>
                            <th>Label</th>
                            <th>Name</th>
                            <th>Similarity</th>
                            <th>Date/Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(paginatedEventsNoLocation || []).map((ev, i) => {
                            const fd = Array.isArray(ev?.face_detections) && ev.face_detections.length > 0 ? ev.face_detections[0] : null;
                            const img = collectImageCandidates(ev, fd);
                            const sim = typeof ev?.top_match?.similarity === 'number' ? `${(ev.top_match.similarity * 100).toFixed(1)}%` : '—';
                            const simValue = ev?.top_match?.similarity || 0;
                            const simColor = simValue > 0.9 ? '#28a745' : simValue > 0.8 ? '#ffc107' : '#dc3545';
                            const when = ev?.create_time || fd?.detect_time || '—';
                            const userData = getHighestSimilarityUserData(ev);

                            return (
                              <tr key={ev?.event_id || `no-loc-${i}`}>
                                <td style={{ whiteSpace: 'nowrap' }}>{ev?.source || '—'}</td>
                                <td>{img ? <ImageTry urls={img} alt="snapshot" /> : <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>}</td>
                                <td><OriginalSnapshot faceId={ev?.top_match?.face_id} /></td>
                                <td>{ev?.top_match?.label || ev?.user_data || '—'}</td>
                                <td>{userData}</td>
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
                                <td>
                                  <span className="badge bg-warning text-dark">
                                    <i className="bi bi-geo-alt-slash me-1"></i>
                                    No Location
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination Controls for Location Not Found */}
                    {totalPagesNoLocation > 1 && (
                      <div className="d-flex justify-content-between align-items-center mt-3 px-3">
                        <div className="text-muted small">
                          Page {currentPageNoLocation} of {totalPagesNoLocation}
                        </div>
                        <nav>
                          <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${currentPageNoLocation === 1 ? 'disabled' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setCurrentPageNoLocation(1)}
                                disabled={currentPageNoLocation === 1}
                              >
                                First
                              </button>
                            </li>
                            <li className={`page-item ${currentPageNoLocation === 1 ? 'disabled' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setCurrentPageNoLocation(prev => Math.max(1, prev - 1))}
                                disabled={currentPageNoLocation === 1}
                              >
                                Previous
                              </button>
                            </li>
                            
                            {/* Page numbers */}
                            {(() => {
                              const pages = [];
                              const startPage = Math.max(1, currentPageNoLocation - 2);
                              const endPage = Math.min(totalPagesNoLocation, currentPageNoLocation + 2);
                              
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <li key={i} className={`page-item ${currentPageNoLocation === i ? 'active' : ''}`}>
                                    <button 
                                      className="page-link" 
                                      onClick={() => setCurrentPageNoLocation(i)}
                                    >
                                      {i}
                                    </button>
                                  </li>
                                );
                              }
                              return pages;
                            })()}
                            
                            <li className={`page-item ${currentPageNoLocation === totalPagesNoLocation ? 'disabled' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setCurrentPageNoLocation(prev => Math.min(totalPagesNoLocation, prev + 1))}
                                disabled={currentPageNoLocation === totalPagesNoLocation}
                              >
                                Next
                              </button>
                            </li>
                            <li className={`page-item ${currentPageNoLocation === totalPagesNoLocation ? 'disabled' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => setCurrentPageNoLocation(totalPagesNoLocation)}
                                disabled={currentPageNoLocation === totalPagesNoLocation}
                              >
                                Last
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : activeTab === 'streams' ? (
              // Streams Section - Show Events that match with Luna/Dahua
              <>
                {streamEventsLoading && <p className="alert alert-info">Loading stream events…</p>}
                {streamEventsError && <p className="alert alert-danger">{streamEventsError}</p>}
                {!streamEventsLoading && !streamEventsError && filteredStreamEvents.length === 0 && streamEvents.length > 0 && (
                  <div className="alert alert-warning mb-0">
                    <i className="bi bi-funnel me-2"></i>
                    No events match your current filters for {streamsSubTab === 'luna' ? 'Luna streams' : 'Dahua cameras'}. Try adjusting the filters.
                  </div>
                )}
                {!streamEventsLoading && !streamEventsError && streamEvents.length === 0 && (
                  <div className="alert alert-info mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    No events found that match with {streamsSubTab === 'luna' ? 'Luna streams' : 'Dahua cameras'}. Events will appear here when their source matches stream names or camera track IDs.
                  </div>
                )}
                {!streamEventsLoading && !streamEventsError && filteredStreamEvents.length > 0 && (
                  <>
                    <div className="d-flex justify-content-between align-items-center mb-3 px-3">
                      <div className="text-muted small">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length)} of {showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length} events
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <label className="form-label small mb-0">Items per page:</label>
                        <select 
                          className="form-select form-select-sm" 
                          style={{ width: 'auto' }}
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-striped table-bordered align-middle">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ whiteSpace: 'nowrap' }}>Camera (source)</th>
                            <th>Detected Image</th>
                            <th>Original Image</th>
                            <th>Label</th>
                            <th>Name</th>
                            <th>Similarity</th>
                            <th>Date/Time</th>
                            <th>City</th>
                            <th>Area</th>
                            <th>Lat</th>
                            <th>Lng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedStreamEvents.map((ev, i) => {
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
                            const userData = getHighestSimilarityUserData(ev);

                            return (
                              <tr key={ev?.event_id || i}>
                                <td style={{ whiteSpace: 'nowrap' }}>{ev?.source || '—'}</td>
                                <td>{img ? <ImageTry urls={img} alt="snapshot" /> : <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>}</td>
                                <td><OriginalSnapshot faceId={ev?.top_match?.face_id} /></td>
                                <td>{ev?.top_match?.label || ev?.user_data || '—'}</td>
                                <td>{userData}</td>
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
                    
                    {/* Pagination for Stream Events */}
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted small">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length)} of {showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length} events
                      </div>
                      <nav>
                        <ul className="pagination pagination-sm mb-0">
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                            >
                              First
                            </button>
                          </li>
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {(() => {
                            const totalStreamPages = Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage);
                            const pages = [];
                            const startPage = Math.max(1, currentPage - 2);
                            const endPage = Math.min(totalStreamPages, currentPage + 2);
                            
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                  <button 
                                    className="page-link" 
                                    onClick={() => setCurrentPage(i)}
                                  >
                                    {i}
                                  </button>
                                </li>
                              );
                            }
                            return pages;
                          })()}
                          
                          <li className={`page-item ${currentPage === Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage) ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(prev => Math.min(Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage), prev + 1))}
                              disabled={currentPage === Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage)}
                            >
                              Next
                            </button>
                          </li>
                          <li className={`page-item ${currentPage === Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage) ? 'disabled' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => setCurrentPage(Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage))}
                              disabled={currentPage === Math.ceil((showClusterData ? clusterFilteredStreamEvents.length : filteredStreamEvents.length) / itemsPerPage)}
                            >
                              Last
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>
      

    </div>
  );
}
