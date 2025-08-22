'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapComponent() {
  const [markedLocations, setMarkedLocations] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const mapRef = useRef(null);
  const markersRef = useRef([]); // Store marker instances

  useEffect(() => {
    const map = L.map('map').setView([33.6844, 73.0479], 10);
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 500);

    const customIcon = L.icon({
      iconUrl: '/marker-icon.png',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    map.on('click', async function (e) {
      const { lat, lng } = e.latlng;
      let locationName = 'Unknown';

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        if (data?.display_name) {
          locationName = data.display_name;
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
      }

      const popupContent = L.DomUtil.create('div');
      popupContent.innerHTML = `
        <div style="max-width: 250px; font-family: sans-serif;">
          <h6 style="margin-bottom: 8px;">Do you want to mark this location?</h6>
          <p style="font-size: 14px; margin: 0;"><strong>Name:</strong> ${locationName}</p>
          <p style="font-size: 14px; margin: 0;"><strong>Latitude:</strong> ${lat.toFixed(5)}</p>
          <p style="font-size: 14px;"><strong>Longitude:</strong> ${lng.toFixed(5)}</p>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button id="yesBtn" style="padding: 4px 10px; background-color: green; color: white; border: none; border-radius: 3px;">Yes</button>
            <button id="noBtn" style="padding: 4px 10px; background-color: red; color: white; border: none; border-radius: 3px;">No</button>
          </div>
        </div>
      `;

      const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(map);

      setTimeout(() => {
        document.getElementById('yesBtn')?.addEventListener('click', () => {
          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
          markersRef.current.push(marker);
          setMarkedLocations((prev) => [...prev, { name: locationName, lat, lng }]);
          map.closePopup();
        });

        document.getElementById('noBtn')?.addEventListener('click', () => {
          map.closePopup();
        });
      }, 100);
    });

    return () => {
      map.remove();
    };
  }, []);

  const handleLocationClick = (location, index) => {
    const map = mapRef.current;
    if (map && location) {
      map.setView([location.lat, location.lng], 14);
      markersRef.current[index]?.openPopup();
    }
    setDropdownOpen(false);
  };

  const handleDelete = (index) => {
    const confirmDelete = window.confirm('Do you want to delete this marked location?');
    if (confirmDelete) {
      markersRef.current[index]?.remove(); // Remove marker from map
      markersRef.current.splice(index, 1); // Remove from marker ref
      setMarkedLocations((prev) => prev.filter((_, i) => i !== index)); // Remove from state
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Dropdown button */}
      <div
  style={{
    position: 'absolute',
    top: 10,
    left: 10, // moved to right side
    zIndex: 1000,
    backgroundColor: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    fontSize: '14px',
    cursor: 'pointer',
    userSelect: 'none',
  }}
  onClick={() => setDropdownOpen(!dropdownOpen)}
>
  Marked Locations ▼
</div>

      {/* Dropdown content */}
      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 10,
            zIndex: 1000,
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '6px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            maxHeight: '250px',
            overflowY: 'auto',
            width: '280px',
          }}
        >
          {markedLocations.length === 0 ? (
            <p style={{ margin: 0, fontSize: '14px' }}>
              No marked locations yet.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              {markedLocations.map((loc, index) => (
                <li
                  key={index}
                  style={{
                    fontSize: '13px',
                    padding: '6px 8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleLocationClick(loc, index)}
                  >
                    {index + 1}. 📍 {loc.name}
                  </span>
                  <button
                    onClick={() => handleDelete(index)}
                    style={{
                      background: 'red',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      marginLeft: '6px',
                    }}
                  >
                    ✖
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Map container */}
      <div
        id="map"
        style={{
          height: '100vh',
          width: '100vw',
        }}
      />
    </div>
  );
}
