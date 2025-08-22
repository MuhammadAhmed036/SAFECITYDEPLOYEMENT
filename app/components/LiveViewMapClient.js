'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import Popup from './Popup';

/* =========================
   CONFIG
   ========================= */
const API_URL = 'http://192.168.18.70:5000/6/events?source=dahua_camera_office1';
const DEFAULT_CENTER = [33.6844, 73.0479]; // Islamabad/Rawalpindi approx
const FALLBACK_ICON = '/camera-icon.svg';   // keep this file in /public
const BASE = 'http://192.168.18.70:5000';

// Camera icon for markers
const CameraIcon = L.icon({
  iconUrl: '/camera-icon.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});
L.Marker.prototype.options.icon = CameraIcon;

/* =========================
   STYLES
   ========================= */
const css = `
.leaflet-popup-content-wrapper{border-radius:10px; box-shadow:0 12px 28px rgba(0,0,0,.18)}
.leaflet-popup-content{margin:0; padding:0}
.marker-cluster{background-color:rgba(14,165,233,.18)}
.marker-cluster div{background:#0ea5e9; color:#fff; font-weight:700; border:2px solid #fff}
.lv-card{width:280px; padding:12px}
.lv-row{display:flex; gap:12px; align-items:center; margin-bottom:8px}
.lv-thumb{width:84px; height:84px; border-radius:10px; overflow:hidden; background:#f3f4f6; border:2px solid #e5e7eb; display:flex; align-items:center; justify-content:center}
.lv-thumb img{width:100%; height:100%; object-fit:cover}
.lv-title{font-weight:700; font-size:15px; color:#0ea5e9}
.lv-muted{font-size:13px; color:#6b7280; margin-top:4px}
.lv-meta{font-size:13px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:8px; margin-top:6px}
`;

/* =========================
   HELPERS
   ========================= */
const looksLikeImagePath = (p) =>
  typeof p === 'string' && /\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/i.test(p.trim());

const escapeHtml = (s) => (s == null ? '' : String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;'));

const viaProxy = (u) => `/api/image-proxy?url=${encodeURIComponent(u)}`;

const addCacheBuster = (url, key) => {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    u.searchParams.set('_v', String(key || Date.now()));
    return u.toString();
  } catch {
    return `${url}${url.includes('?') ? '&' : '?'}_v=${key || Date.now()}`;
  }
};

// Normalize base URL to absolute
const normalizeBase = (p) => {
  if (!p) return '';
  // Keep mock images as local paths for Next.js serving
  if (p.includes('/mock-images/')) {
    return p.startsWith('/') ? p : `/${p}`;
  }
  return p.startsWith('http') ? p : `${BASE}${p}`;
};

// Build the strongest set of image candidates (proxy-first, then direct)
// Includes encode/decode/%40 variants and adds a per-event cache-buster to EVERY candidate
const collectImageCandidates = (ev, fd, cacheKey) => {
  const rawList = [
    fd?.image_origin,
    ev?.snapshot,
    ev?.image,
    ev?.image_url,
    ev?.img,
    ev?.thumbnail,
    ev?.photo,
    looksLikeImagePath(ev?.source) ? ev.source : null,
  ].filter((c) => typeof c === 'string' && c.trim().length > 0)
   .map((s) => s.trim());

  const out = [];
  for (const raw of rawList) {
    // Check for mock images before normalizing to avoid remote URL conversion
    if (raw.includes('/mock-images/')) {
      const localPath = raw.startsWith('/') ? raw : `/${raw}`;
      out.push(addCacheBuster(localPath, cacheKey));
      continue;
    }

    const full = normalizeBase(raw);
    if (!full) continue;

    const variants = [full];
    try { variants.push(encodeURI(full)); } catch {}
    try { variants.push(decodeURI(full)); } catch {}
    if (full.includes('%40')) variants.push(full.replaceAll('%40', '@'));

    for (const v of variants) {
      // Proxy first (avoid CORS/mixed-content), with cache-buster
      out.push(addCacheBuster(viaProxy(v), cacheKey));
      // Direct as last resort (also cache-busted)
      out.push(addCacheBuster(v, cacheKey));
    }
  }
  return Array.from(new Set(out));
};

// Normalize an API event into a consistent format
const normalizeEvent = (ev) => {
  const lat = ev?.location?.geo_position?.latitude ?? ev?.latitude;
  const lng = ev?.location?.geo_position?.longitude ?? ev?.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Time & cacheKey (use stable event time/id so newest snapshots always reload)
  const when = ev?.create_time || ev?.detect_time || ev?.createdAt || ev?.datetime || null;
  const fd = Array.isArray(ev?.face_detections) && ev.face_detections.length > 0 ? ev.face_detections[0] : null;
  const cacheKey = when || fd?.detect_time || ev?.event_id || ev?.id || Date.now();

  // Candidate list with cache-buster applied to each
  const imageCandidates = collectImageCandidates(ev, fd, cacheKey);

  return {
    lat,
    lng,
    label: ev?.top_match?.label || ev?.user_data || ev?.name || 'Unknown',
    similarity: Number.isFinite(ev?.top_match?.similarity) ? `${(ev.top_match.similarity * 100).toFixed(1)}%` : '—',
    when: when || '—',
    city: ev?.location?.city || ev?.city || '—',
    area: ev?.location?.area || ev?.area || '—',
    image: imageCandidates[0] || null,
    imageCandidates,
    eventId: ev?.event_id || ev?.id || cacheKey,
    timestamp: new Date(when || Date.now()).getTime(),
  };
};

// Filter events to show only the latest per camera location
const getLatestEventsPerLocation = (events) => {
  const locationMap = new Map();
  events.forEach(event => {
    const locationKey = `${event.lat.toFixed(6)},${event.lng.toFixed(6)}`;
    const existing = locationMap.get(locationKey);
    if (!existing || event.timestamp > existing.timestamp) {
      locationMap.set(locationKey, event);
    }
  });
  return Array.from(locationMap.values());
};

/* =========================
   IMAGE COMPONENT WITH FALLBACK (robust reset + forced reload)
   ========================= */
function ImageWithFallback({ imageCandidates = [], fallbackIcon, alt }) {
  const safe = useMemo(
    () => (Array.isArray(imageCandidates) ? imageCandidates.filter(Boolean) : []),
    [imageCandidates]
  );
  const listKey = useMemo(() => safe.join('|'), [safe]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setHasError(false);
  }, [listKey]);

  const src = safe[currentIndex];

  if (!src || hasError) {
    return (
      <div className="event-image-placeholder">
        <img
          src={fallbackIcon}
          alt="No image available"
          className="event-image"
          style={{ maxWidth: '100%', height: 'auto', borderRadius: 6 }}
        />
        <p style={{ textAlign: 'center', color: '#666', marginTop: '8px', fontSize: '14px' }}>
          No image available
        </p>
      </div>
    );
  }

  return (
    <img
      key={src}                      // force a fresh request when src changes
      src={src}
      alt={alt}
      className="event-image"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onLoad={() => { /* loaded ok */ }}
      onError={() => {
        if (currentIndex < safe.length - 1) setCurrentIndex((i) => i + 1);
        else setHasError(true);
      }}
      style={{ maxWidth: '100%', height: 'auto', borderRadius: 6 }}
    />
  );
}

/* =========================
   MAIN COMPONENT
   ========================= */
export default function LiveCameraMap({ height = 500, events = [] }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const hasInitiallyFitBounds = useRef(false);

  // Inject CSS
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // Normalize data and filter to latest events per location
  const points = useMemo(() => {
    const out = [];
    for (const ev of Array.isArray(events) ? events : []) {
      const p = normalizeEvent(ev);
      if (p) out.push(p);
    }
    return getLatestEventsPerLocation(out);
  }, [events]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(ref.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      minZoom: 3,
      maxZoom: 19,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      preferCanvas: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(map);

    const mcg = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 16,
      maxClusterRadius: 50,
      chunkedLoading: true,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          html: `<div class="marker-cluster-inner"><span>${cluster.getChildCount()}</span></div>`,
          className: 'marker-cluster',
          iconSize: new L.Point(40, 40),
        }),
    });
    clusterRef.current = mcg;
    map.addLayer(mcg);

    return () => {
      map.remove();
    };
  }, []);

  // Update markers with click handlers for structured popup
  useEffect(() => {
    const mcg = clusterRef.current;
    if (!mcg) return;

    mcg.clearLayers();
    for (const p of points) {
      const marker = L.marker([p.lat, p.lng]);
      marker.on('click', () => {
        setSelectedEvent(p);     // contains imageCandidates with cache-busters
        setPopupOpen(true);
      });
      mcg.addLayer(marker);
    }

    // Only auto-fit bounds on initial load, preserve user control afterwards
    if (points.length > 0 && mapRef.current && !hasInitiallyFitBounds.current) {
      mapRef.current.fitBounds(mcg.getBounds(), { padding: [20, 20] });
      hasInitiallyFitBounds.current = true;
    }
  }, [points]);

  return (
    <div style={{ width: '100%' }}>
      <div
        ref={ref}
        style={{
          width: '100%',
          height,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          background: '#fafafa',
        }}
      />

      {/* Structured Popup */}
      <Popup
        display="center"
        isOpen={isPopupOpen}
        onClose={() => setPopupOpen(false)}
      >
        {selectedEvent && (
          <div className="event-details">
            <div className="popup-header">
              <h3 className="popup-title">Detection Details</h3>
            </div>
            <div className="popup-body">
              <ImageWithFallback
                imageCandidates={selectedEvent.imageCandidates || []}
                fallbackIcon={FALLBACK_ICON}
                alt="Detection snapshot"
              />
              <div className="event-info">
                <div className="event-info-item">
                  <span className="event-info-label">Person</span>
                  <span className="event-info-value">{selectedEvent.label}</span>
                </div>
                <div className="event-info-item">
                  <span className="event-info-label">Similarity</span>
                  <span className="event-info-value">{selectedEvent.similarity}</span>
                </div>
                <div className="event-info-item">
                  <span className="event-info-label">Time</span>
                  <span className="event-info-value">{selectedEvent.when}</span>
                </div>
                <div className="event-info-item">
                  <span className="event-info-label">City</span>
                  <span className="event-info-value">{selectedEvent.city}</span>
                </div>
                <div className="event-info-item">
                  <span className="event-info-label">Area</span>
                  <span className="event-info-value">{selectedEvent.area}</span>
                </div>
                <div className="event-info-item">
                  <span className="event-info-label">Location</span>
                  <span className="event-info-value">
                    {selectedEvent.lat.toFixed(6)}, {selectedEvent.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            </div>
            <div className="popup-footer">
              <button
                className="popup-button primary"
                onClick={() => setPopupOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Popup>
    </div>
  );
}
