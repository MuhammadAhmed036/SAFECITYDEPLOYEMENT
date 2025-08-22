"use client";
import { useState } from "react";
import Accordion from "react-bootstrap/Accordion";

export default function CreateStreamPage() {
  return (
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Create a Stream</h2>
      </div>

      <div className="card shadow-sm border-1 rounded">
        <div className="card-body">
          {/* 👇 Removed `alwaysOpen` so only one item opens at a time */}
          <Accordion defaultActiveKey="0">
            {/* Basic Info */}
            <Accordion.Item eventKey="0">
              <Accordion.Header>📘 Basic Info</Accordion.Header>
              <Accordion.Body>
                <div className="mb-3">
                  <label className="form-label fw-semibold">* Account ID</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="00000000-0000-4000-b000-000000000146"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">* Zone</label>
                  <select className="form-select" required>
                    <option value="">Select Zone</option>
                    <option value="Zone1">Zone 1</option>
                    <option value="Zone2">Zone 2</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">* Stream Name</label>
                  <input type="text" className="form-control" required placeholder="Stream Name" />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">* Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    required
                    placeholder="Enter description"
                  ></textarea>
                </div>
              </Accordion.Body>
            </Accordion.Item>

            {/* Event Handler */}
            <Accordion.Item eventKey="1">
              <Accordion.Header>⚙️ Event Handler</Accordion.Header>
              <Accordion.Body>
                <div className="mb-3">
                  <label className="form-label fw-semibold">* Event Prigion</label>
                  <input type="text" className="form-control" required placeholder="Event Prigion" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">* Bests Handler ID</label>
                  <input type="text" className="form-control" required placeholder="Bests Handler ID" />
                </div>
              </Accordion.Body>
            </Accordion.Item>

            {/* Stream Data */}
            <Accordion.Item eventKey="2">
              <Accordion.Header>💾 Stream Data</Accordion.Header>
              <Accordion.Body>
                {[
                  "Reference URL",
                  "Type",
                  "Rotation",
                  "Frame Width",
                  "X",
                  "Y",
                  "Width",
                  "Height",
                  "Roi Mode",
                ].map((label, i) => (
                  <div className="mb-3" key={i}>
                    <label className="form-label fw-semibold">* {label}</label>
                    {label === "Type" ? (
                      <select className="form-select" required>
                        <option value="">Udp</option>
                        <option value="Tcp">Tcp</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder={["Rotation", "X", "Y", "Width", "Height"].includes(label) ? "0" : label}
                      />
                    )}
                  </div>
                ))}
              </Accordion.Body>
            </Accordion.Item>

            {/* Location */}
            <Accordion.Item eventKey="3">
              <Accordion.Header>📍 Location</Accordion.Header>
              <Accordion.Body>
                {[
                  "City",
                  "Area",
                  "District",
                  "Street",
                  "House #",
                  "Latitude",
                  "Longitude",
                ].map((label, i) => (
                  <div className="mb-3" key={i}>
                    <label className="form-label fw-semibold">* {label}</label>
                    <input type="text" className="form-control" required placeholder={label} />
                  </div>
                ))}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>

          <button type="submit" className="btn btn-success mt-4 w-100">
            ✅ Submit Stream
          </button>
        </div>
      </div>
    </div>
  );
}
