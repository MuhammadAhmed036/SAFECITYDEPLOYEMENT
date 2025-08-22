'use client';

import { useEffect, useMemo, useState } from 'react';

// Use the new API endpoint
const EVENTS_API = 'http://192.168.18.70:5000/6/events?page=1&page_size=100';

export default function EventsGallery() {
  const [images, setImages] = useState([]); // { url, detect_time, source, event_id }[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let aborted = false;

    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(EVENTS_API, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const events = Array.isArray(data?.events) ? data.events : [];
        const rows = [];
        for (const ev of events) {
          const source = ev?.source || '';
          const event_id = ev?.event_id;
          
          // Add the main source image if available
          if (source && source.startsWith('http')) {
            rows.push({
              url: source,
              detect_time: ev?.create_time || null,
              source: 'Main Image',
              event_id,
              user_data: ev?.user_data,
              top_match: ev?.top_match,
            });
          }
          
          // Add face detection images if available
          const fds = Array.isArray(ev?.face_detections) ? ev.face_detections : [];
          for (const fd of fds) {
            if (fd?.sample_id) {
              rows.push({
                url: source, // Use the source as the image URL
                detect_time: fd?.detect_time || ev?.create_time || null,
                source: 'Face Detection',
                event_id,
                user_data: ev?.user_data,
                top_match: ev?.top_match,
              });
            }
          }
        }

        if (!aborted) setImages(rows);
      } catch (e) {
        if (!aborted) setError(e.message || 'Failed to load images');
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    fetchEvents();
    return () => { aborted = true; };
  }, []);

  const sorted = useMemo(() => {
    return [...images].sort((a, b) => {
      const ta = a.detect_time ? Date.parse(a.detect_time) : 0;
      const tb = b.detect_time ? Date.parse(b.detect_time) : 0;
      return tb - ta;
    });
  }, [images]);

  if (loading) return <p className="alert alert-info">Loading images…</p>;
  if (error) return <p className="alert alert-danger">Failed to load images: {error}</p>;
  if (sorted.length === 0) return <p className="alert alert-warning">No images found.</p>;

  return (
    <div className="mb-4">
      <h4 className="mb-3">Latest Face Snapshots ({sorted.length})</h4>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {sorted.map((img, i) => (
          <figure
            key={`${img.event_id || 'ev'}-${i}`}
            style={{
              margin: 0,
              border: '1px solid #eee',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#fafafa',
            }}
          >
            <div style={{ aspectRatio: '4 / 3', width: '100%', overflow: 'hidden' }}>
              <img
                src={img.url}
                alt={`event ${img.event_id || ''}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.opacity = 0.3; }}
              />
            </div>
            <figcaption style={{ padding: '8px 10px', fontSize: 13 }}>
              <div><b>Source:</b> {img.source}</div>
              {img.detect_time && <div><b>Time:</b> {new Date(img.detect_time).toLocaleString()}</div>}
              {img.user_data && <div><b>User:</b> {img.user_data}</div>}
              {img.top_match?.similarity && (
                <div>
                  <b>Match:</b> {(img.top_match.similarity * 100).toFixed(2)}%
                </div>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
