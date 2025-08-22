'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';

const BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://192.168.18.70:5000';

// Fallback coordinates if API data is missing
const DEFAULT_COORDS = [33.6770, 73.0632];

// Note: we rely on API-provided coordinates; fallback only uses DEFAULT_COORDS

const buildImageUrl = (p) => {
  if (!p || typeof p !== 'string') return null;
  const full = p.startsWith('http') ? p : `${BASE}${p}`;
  try { return encodeURI(full); } catch { return full; }
};

const looksLikeImagePath = (p) => typeof p === 'string' && /\.(png|jpe?g|gif|bmp|webp|svg)(\?.*)?$/i.test(p.trim());

const pickEventImage = (ev, fd) => {
  const candidates = [
    fd?.image_origin,
    ev?.snapshot,
    ev?.image,
    ev?.image_url,
    ev?.img,
    ev?.thumbnail,
    looksLikeImagePath(ev?.source) ? ev.source : null,
  ];
  const first = candidates.find((c) => typeof c === 'string' && c.length > 0);
  return buildImageUrl(first);
};

// best timestamp for each face
const tsOf = (ev, fd) =>
  (fd?.detect_time && Date.parse(fd.detect_time)) ||
  (ev?.create_time && Date.parse(ev.create_time)) ||
  0;

export default function LeafletMapClient({ events = [] }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Extract and normalize coordinates from an event
  const extractCoords = (ev) => {
    // First try to get coordinates from location.geo_position
    const gp = ev?.location?.geo_position;
    let lat = undefined;
    let lng = undefined;
    
    if (gp) {
      const rawLat = gp.latitude ?? gp.lat ?? gp.y;
      const rawLng = gp.longitude ?? gp.lng ?? gp.lon ?? gp.x;
      lat = typeof rawLat === 'string' ? parseFloat(rawLat) : rawLat;
      lng = typeof rawLng === 'string' ? parseFloat(rawLng) : rawLng;
      // Some APIs provide [lon, lat]; detect flipped values by range
      if (lat && lng && Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const tmp = lat;
        lat = lng;
        lng = tmp;
      }
    } 
    // Also check for direct latitude/longitude properties on the event
    else if (ev?.latitude !== undefined && ev?.longitude !== undefined) {
      lat = typeof ev.latitude === 'string' ? parseFloat(ev.latitude) : ev.latitude;
      lng = typeof ev.longitude === 'string' ? parseFloat(ev.longitude) : ev.longitude;
    }
    
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return DEFAULT_COORDS;
  };

  // Group events by camera (source) and compute per-camera people + coords
  const cameraGroups = useMemo(() => {
    const bySource = new Map();
    for (const ev of Array.isArray(events) ? events : []) {
      const key = ev?.source || 'Unknown';
      if (!bySource.has(key)) bySource.set(key, []);
      bySource.get(key).push(ev);
    }

    const groups = [];
    for (const [source, evs] of bySource.entries()) {
      // Choose representative coordinates (prefer last event that has coords)
      let coords = DEFAULT_COORDS;
      for (let i = evs.length - 1; i >= 0; i--) {
        const c = extractCoords(evs[i]);
        if (Array.isArray(c)) { coords = c; break; }
      }

      // Build people list for this camera
      const people = [];
      for (const ev of evs) {
        const fds = Array.isArray(ev?.face_detections) ? ev.face_detections : [];
        for (const fd of fds) {
          people.push({
            when: tsOf(ev, fd),
            whenStr: fd?.detect_time || ev?.create_time || null,
            label: ev?.top_match?.label ?? ev?.user_data ?? '—',
            similarity: typeof ev?.top_match?.similarity === 'number' ? ev.top_match.similarity : null,
            image: pickEventImage(ev, fd),
            eventId: ev?.event_id,
            trackId: fd?.track_id || ev?.track_id || ev?.event_id || null,
          });
        }
      }
      people.sort((a, b) => b.when - a.when);

      groups.push({ source, coords, people, location: evs[evs.length - 1]?.location });
    }

    // Stable order by source for deterministic marker ordering
    groups.sort((a, b) => String(a.source).localeCompare(String(b.source)));
    return groups;
  }, [events]);

  // init map once
  useEffect(() => {
    if (mapRef.current) return;

    const initialCenter = cameraGroups[0]?.coords || DEFAULT_COORDS;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      zoomAnimation: true,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Layer group to manage all camera markers
    const lg = L.layerGroup().addTo(map);
    layerGroupRef.current = lg;

    const invalidate = () => map.invalidateSize();
    const id = setTimeout(invalidate, 300);
    window.addEventListener('resize', invalidate);

    return () => {
      clearTimeout(id);
      window.removeEventListener('resize', invalidate);
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [cameraGroups]);

  // build markers: one per camera, each with popup + hover tooltip
  useEffect(() => {
    const map = mapRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    const bounds = [];

    for (const group of cameraGroups) {
      const { source, coords, people, location } = group;
      const count = people.length;
      const latest = people[0];

      const iconHtml = `
        <div style="position:relative;width:30px;height:24px;">
          <svg viewBox=\"0 0 24 24\" width=\"30\" height=\"24\" style=\"display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25))\">
            <rect x=\"6\" y=\"3.5\" width=\"6\" height=\"4\" rx=\"1\" fill=\"#111827\"></rect>
            <rect x=\"2\" y=\"6.5\" width=\"20\" height=\"13\" rx=\"3\" fill=\"#111827\"></rect>
            <circle cx=\"12\" cy=\"13\" r=\"6\" fill=\"#0ea5e9\"></circle>
            <circle cx=\"12\" cy=\"13\" r=\"3.5\" fill=\"#ffffff\"></circle>
            <rect x=\"17\" y=\"8.5\" width=\"3\" height=\"2\" rx=\"1\" fill=\"#fbbf24\"></rect>
          </svg>
          <div style="position:absolute; right:-4px; bottom:-6px; min-width:18px; height:18px; padding:0 4px; border-radius:9999px; background:#ef4444; color:#fff; border:2px solid #fff; font:700 11px/18px system-ui, -apple-system, Segoe UI, Roboto; text-align:center;">${count}</div>
        </div>`;

      const marker = L.marker(coords, {
        icon: L.divIcon({
          html: iconHtml,
          className: 'camera-marker',
          iconSize: [30, 24],
          iconAnchor: [15, 24],
          popupAnchor: [0, -22],
        }),
      }).addTo(lg);

      bounds.push(coords);

      const latestBlock = latest
        ? `
          <div style="margin-bottom:10px">
            <div style="font-weight:700;margin-bottom:4px">Last Activity</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              ${latest.whenStr ? `<div style=\"font-size:12px;color:#555;\">${new Date(latest.whenStr).toLocaleString()}</div>` : ''}
              ${latest.trackId ? `<div style=\"font-size:12px;color:#555;\"><b>Track ID:</b> ${latest.trackId}</div>` : ''}
            </div>
            ${latest.image ? `<img src=\"${latest.image}\" alt=\"latest\" style=\"width:100%;height:auto;border-radius:6px\" onerror=\"this.src='/camera-icon.svg';this.style.opacity=0.5;\" />` : ''}
            <div style="margin-top:6px;font-size:14px;">
              <b>Label:</b> ${latest.label || '—'}
              ${typeof latest.similarity === 'number' ? `<span style=\"margin-left:10px;\"><b>Match:</b> ${(latest.similarity * 100).toFixed(2)}%</span>` : ''}
            </div>
          </div>`
        : `<div style="margin-bottom:10px;color:#777">No snapshots yet.</div>`;

      const others = people.slice(1);
      const othersBlock = others.length
        ? `
          <div style="font-weight:700;margin:10px 0 6px;">Recent Activities (${others.length})</div>
          <div style="max-height:320px;overflow:auto;border:1px solid #eee;border-radius:8px;padding:8px;background:#fafafa;">
            ${others
              .map(
                (p, i) => `
                <div style=\"${i ? 'margin-top:10px;padding-top:10px;border-top:1px solid #eee;' : ''}\">
                  <div style=\"display:flex;gap:8px;align-items:center;\">
                    <div style=\"flex:0 0 70px;height:50px;border-radius:4px;overflow:hidden;background:#eee;display:flex;align-items:center;justify-content:center;\">
                      ${
                        p.image
                          ? `<img src=\\\"${p.image}\\\" alt=\\\"p\\\" style=\\\"width:100%;height:100%;object-fit:cover\\\" onerror=\\\"this.src='/camera-icon.svg';this.style.opacity=0.5;\\\" />`
                          : `<svg width=\\\"24\\\" height=\\\"24\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#999\\\" stroke-width=\\\"2\\\"><circle cx=\\\"12\\\" cy=\\\"8\\\" r=\\\"5\\\"/><path d=\\\"M3 21v-2a7 7 0 0 1 14 0v2\\\"/></svg>`
                      }
                    </div>
                    <div style=\"flex:1;\">
                      <div style=\"font-size:14px\"><b>${p.label || '—'}</b></div>
                      <div style=\"display:flex;justify-content:space-between;\">
                        ${p.whenStr ? `<div style=\\\"font-size:12px;color:#666;\\\">${new Date(p.whenStr).toLocaleString()}</div>` : ''}
                        ${p.trackId ? `<div style=\\\"font-size:12px;color:#666;\\\"><b>ID:</b> ${p.trackId}</div>` : ''}
                      </div>
                      ${typeof p.similarity === 'number' ? `<div style=\\\"font-size:12px;margin-top:2px;\\\"><b>Match:</b> ${(p.similarity * 100).toFixed(2)}%</div>` : ''}
                    </div>
                  </div>
                </div>`
              )
              .join('')}
          </div>`
        : '';

      const locationInfo = '';

      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto;min-width:260px;max-width:360px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:10px;height:10px;border-radius:9999px;background:#0ea5e9"></div>
            <div style="font-weight:700">Camera (${source || 'Unknown'})</div>
            <div style="margin-left:auto;font-size:12px;color:#555">${count} people</div>
          </div>
          ${locationInfo}
          ${latestBlock}
          ${othersBlock}
        </div>`;

      marker.bindPopup(popupHtml, { maxWidth: 380 });

      const tooltipHtml = `
        <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto; min-width:260px; max-width:340px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <div style="width:8px;height:8px;border-radius:9999px;background:#0ea5e9"></div>
            <div style="font-weight:600">Last Activity</div>
            <div style="margin-left:auto;font-size:12px;color:#555">${count} total</div>
          </div>
          
          ${latest ? `
          <div style="padding:8px;background:#f0f9ff;border:1px solid #e0f2fe;border-radius:8px;margin-bottom:8px">
            <div style="display:flex;gap:10px;">
              <div style="flex:0 0 60px;height:60px;border-radius:6px;overflow:hidden;background:#eee;display:flex;align-items:center;justify-content:center;">
                ${latest.image
                  ? `<img src=\"${latest.image}\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover\" onerror=\"this.src='/camera-icon.svg';this.style.opacity=0.5;\" />`
                  : `<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#999\" stroke-width=\"2\"><circle cx=\"12\" cy=\"8\" r=\"5\"/><path d=\"M3 21v-2a7 7 0 0 1 14 0v2\"/></svg>`
                }
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${latest.label || '—'}</div>
                <div style="display:flex;justify-content:space-between;margin-top:2px;">
                  <div style="font-size:12px;color:#334155;">${latest.whenStr ? new Date(latest.whenStr).toLocaleString() : ''}</div>
                  ${latest.trackId ? `<div style=\"font-size:12px;color:#334155;\"><b>Track:</b> ${latest.trackId}</div>` : ''}
                </div>
                ${typeof latest.similarity === 'number' ? `<div style=\"font-size:12px;margin-top:4px;\"><b>Match:</b> ${(latest.similarity * 100).toFixed(2)}%</div>` : ''}
              </div>
            </div>
          </div>` : ''}
          
          <div style="font-weight:600;font-size:13px;margin:8px 0 4px;">${people.length > 1 ? 'Recent Activities' : ''}</div>
          <div style="max-height:200px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">
            ${
              people.length > 1
                ? people.slice(1).map((p) => `
                    <div style=\"display:flex;gap:10px;padding:8px;border-bottom:1px solid #f1f5f9;\">
                      <div style=\"flex:0 0 40px;height:40px;border-radius:6px;overflow:hidden;background:#eee;display:flex;align-items:center;justify-content:center;\">
                        ${
                          p.image
                            ? `<img src=\\\"${p.image}\\\" alt=\\\"\\\" style=\\\"width:100%;height:100%;object-fit:cover\\\" onerror=\\\"this.src='/camera-icon.svg';this.style.opacity=0.5;\\\" />`
                            : `<svg width=\\\"20\\\" height=\\\"20\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" stroke=\\\"#999\\\" stroke-width=\\\"2\\\"><circle cx=\\\"12\\\" cy=\\\"8\\\" r=\\\"5\\\"/><path d=\\\"M3 21v-2a7 7 0 0 1 14 0v2\\\"/></svg>`
                        }
                      </div>
                      <div style=\"flex:1;min-width:0;\">
                        <div style=\"font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">${p.label || '—'}</div>
                        <div style=\"display:flex;justify-content:space-between;\">
                          <div style=\"font-size:11px;color:#6b7280;\">${p.whenStr ? new Date(p.whenStr).toLocaleString() : ''}</div>
                          ${p.trackId ? `<div style=\\\"font-size:11px;color:#6b7280;\\\"><b>ID:</b> ${p.trackId}</div>` : ''}
                        </div>
                      </div>
                    </div>`
                  ).join('')
                : people.length === 0 ? `<div style=\"padding:10px;color:#6b7280;\">No snapshots.</div>` : ''
            }
          </div>
          <div style="margin-top:6px;font-size:11px;color:#64748b">Tip: click marker for full details</div>
        </div>`;

      marker.bindTooltip(tooltipHtml, {
        direction: 'top',
        sticky: true,
        opacity: 1,
        interactive: true,
        className: 'nts-people-tooltip',
      });

      let closeTimer = null;
      const openTooltip = () => {
        if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
        marker.openTooltip();
      };
      const delayedClose = () => {
        closeTimer = setTimeout(() => marker.closeTooltip(), 120);
      };
      marker.on('mouseover', openTooltip);
      marker.on('mouseout', delayedClose);

      marker.once('remove', () => {
        marker.off('mouseover', openTooltip);
        marker.off('mouseout', delayedClose);
      });
    }

    if (bounds.length) {
      const leafletBounds = L.latLngBounds(bounds);
      map.fitBounds(leafletBounds, { padding: [40, 40] });
    }
  }, [cameraGroups]);

  return (
    <div
      ref={containerRef}
      id="events-map"
      style={{ width: '100%', height: 420, borderRadius: 8, overflow: 'hidden', border: '1px solid #eee' }}
    />
  );
}
