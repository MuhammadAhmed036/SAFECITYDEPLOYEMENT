import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: fetch all zones
export async function GET() {
  try {
    const result = await pool.query("SELECT * FROM zones ORDER BY id DESC");
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("❌ GET /zones error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: create new zone
export async function POST(req) {
  try {
    const { address, latitude, longitude } = await req.json();
    const result = await pool.query(
      "INSERT INTO zones (address, latitude, longitude) VALUES ($1, $2, $3) RETURNING *",
      [address, latitude, longitude]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("❌ POST /zones error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
// PUT: update zone by ID
export async function PUT(req, { params }) {
  const id = params.id;
  try {
    const { address, latitude, longitude } = await req.json();
    const result = await pool.query(
      "UPDATE zones SET address = $1, latitude = $2, longitude = $3 WHERE id = $4 RETURNING *",
      [address, latitude, longitude, id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("❌ PUT /zones/[id] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: delete zone by ID
export async function DELETE(req, { params }) {
  const id = params.id;
  try {
    await pool.query("DELETE FROM zones WHERE id = $1", [id]);
    return NextResponse.json({ message: "Zone deleted successfully" });
  } catch (err) {
    console.error("❌ DELETE /zones/[id] error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}