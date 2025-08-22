"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";

// Fix marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

export default function ZoneMap({ selected, editingZone, onSelect }) {
  const markerRef = useRef();

  function LocationPicker() {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await res.json();
        const address = data.display_name || "Unknown";

        const confirm = window.confirm(
          `Address: ${address}\nLat: ${lat}, Lng: ${lng}\n\nDo you want to ${
            editingZone ? "update" : "save"
          } this zone?`
        );

        if (confirm) {
          onSelect({ address, latitude: lat, longitude: lng });
        }
      },
    });

    return null;
  }

  return (
    <MapContainer
      center={selected ? [selected.lat, selected.lng] : [30.3753, 69.3451]}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationPicker />
      {selected && <Marker position={[selected.lat, selected.lng]} ref={markerRef} />}
    </MapContainer>
  );
}
