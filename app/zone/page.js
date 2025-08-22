"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const ZoneMap = dynamic(() => import("@/app/components/ZoneMap"), { ssr: false });

export default function ZonePage() {
  const [zones, setZones] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [selected, setSelected] = useState(null);

  const markerRef = useRef(null);

  // Fix leaflet marker icon issue
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
    });
  }, []);

  // Fetch zones from database
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch("/api/zones");
        const data = await res.json();
        setZones(data);
      } catch (err) {
        console.error("❌ Error fetching zones:", err.message);
      }
    };
    fetchZones();
  }, []);

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this zone?")) return;
    try {
      await fetch(`/api/zones/${id}`, { method: "DELETE" });
      setZones((prev) => prev.filter((z) => z.id !== id));
    } catch (err) {
      console.error("❌ Error deleting zone:", err.message);
    }
  }

  function handleEdit(zone) {
    setEditingZone(zone);
    setSelected({ lat: zone.latitude, lng: zone.longitude });
    setShowMap(true);
  }

  return (
    <div className="container mt-4">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold">Zone Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingZone(null); // making sure we are not editing
            setSelected(null);
            setShowMap(true);
          }}
        >
          <i className="bi bi-plus-circle me-2"></i>New Zone
        </button>
      </div>

      {/* TABLE */}
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Address</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone, index) => (
              <tr key={zone.id}>
                <td>{index + 1}</td>
                <td>{zone.address}</td>
                <td>{zone.latitude.toFixed(5)}</td>
                <td>{zone.longitude.toFixed(5)}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-2" onClick={() => handleEdit(zone)}>
                    <i className="bi bi-pencil-square"></i> Edit
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(zone.id)}>
                    <i className="bi bi-trash"></i> Delete
                  </button>
                </td>
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted">
                  No zones added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MAP MODAL */}
      {showMap && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded shadow p-3" style={{ width: "90%", height: "90%" }}>
            <div className="d-flex justify-content-between mb-2">
              <h5 className="fw-bold mb-0">{editingZone ? "Edit Zone" : "Select Zone"}</h5>
              <button className="btn-close" onClick={() => setShowMap(false)}></button>
            </div>

            <ZoneMap
              selected={selected}
              editingZone={editingZone}
              onSelect={async ({ address, latitude, longitude }) => {
                try {
                  if (editingZone) {
                    const response = await fetch(`/api/zones/${editingZone.id}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ address, latitude, longitude }),
                    });
                    const updated = await response.json();
                    setZones((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
                  } else {
                    const response = await fetch("/api/zones", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ address, latitude, longitude }),
                    });
                    const created = await response.json();
                    setZones((prev) => [created, ...prev]); // instantly add to table
                  }
                } catch (err) {
                  console.error("❌ Error saving zone:", err.message);
                }
                setShowMap(false);
                setEditingZone(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
