'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix for Leaflet marker icons in Next.js
const fixLeafletIcons = () => {
  // Only run on client side
  if (typeof window !== 'undefined') {
    delete L.Icon.Default.prototype._getIconUrl;
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }
};

// Component to create marker clusters
function MarkerClusterGroup({ streams }) {
  const map = useMap();
  
  // Invalidate size when container dimensions change
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
    }
    
    return () => {
      if (container) {
        resizeObserver.unobserve(container);
      }
    };
  }, [map]);
  
  useEffect(() => {
    if (!streams || streams.length === 0) return;
    
    // Create a marker cluster group with camera icon clusters
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      iconCreateFunction: function(cluster) {
        return L.divIcon({
          html: `<div class="cluster-marker">
                  <img src="/camera-cluster.svg" alt="Camera Cluster" width="40" height="40"/>
                  <span class="cluster-count">${cluster.getChildCount()}</span>
                </div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(50, 50)
        });
      }
    });
    
    // Add markers for each stream
    streams.forEach(stream => {
      // Extract coordinates from the stream data structure
      let lat = 33.6844; // Default latitude
      let lng = 73.0479; // Default longitude
      
      // Check if location and geo_position exist
      if (stream.location && stream.location.geo_position) {
        lat = stream.location.geo_position.latitude;
        lng = stream.location.geo_position.longitude;
      }
      
      const name = stream.name || 'Unknown Location';
      
      // Create a custom marker with camera icon
      const customIcon = L.divIcon({
        html: `<div class="custom-marker">
                <img src="/camera-icon.svg" alt="Camera" width="30" height="30"/>
              </div>`,
        className: 'custom-marker-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });
      
      const marker = L.marker([lat, lng], { icon: customIcon });
      
      // Create popup content with location details and coordinates
      const popupContent = `
        <div style="font-family: Arial, sans-serif; padding: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">${name}</h3>
          <p style="margin: 0 0 5px 0;"><strong>Location:</strong> ${stream.location?.area || 'N/A'}, ${stream.location?.city || 'N/A'}</p>
          <p style="margin: 0 0 5px 0;"><strong>Street:</strong> ${stream.location?.street || 'N/A'}</p>
          <p style="margin: 0 0 5px 0;"><strong>Status:</strong> <span style="color: ${stream.status === 'active' ? 'green' : 'orange'};">${stream.status || 'Unknown'}</span></p>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
            <p style="margin: 0 0 5px 0; color: #e74c3c;"><strong>Latitude:</strong> ${lat}</p>
            <p style="margin: 0 0 5px 0; color: #e74c3c;"><strong>Longitude:</strong> ${lng}</p>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      
      markerClusterGroup.addLayer(marker);
    });
    
    // Add the marker cluster group to the map
    map.addLayer(markerClusterGroup);
    
    // Fit bounds to show all markers
    if (streams.length > 0) {
      const bounds = markerClusterGroup.getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    return () => {
      map.removeLayer(markerClusterGroup);
    };
  }, [map, streams]);
  
  return null;
}

export default function StreamMap({ streams = [] }) {
  const mapRef = useRef(null);
  
  useEffect(() => {
    fixLeafletIcons();
    
    // Force map to update its size when it becomes visible
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 100);
    }
  }, []);
  
  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-200 mb-6">
      <div className="absolute top-4 left-4 z-10 bg-white bg-opacity-90 p-3 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Stream Locations</h3>
        <p className="text-sm text-gray-600">{streams.length || 0} active streams</p>
      </div>
      <MapContainer 
        center={[33.6844, 73.0479]} 
        zoom={10} 
        className="h-full w-full z-0"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          <div className="bg-white p-2 rounded-md shadow-md">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Paused</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Failed</span>
            </div>
          </div>
        </div>
        <MarkerClusterGroup streams={streams} />
      </MapContainer>
    </div>
  );
}