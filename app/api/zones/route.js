import { NextResponse } from "next/server";
import { pool } from "@/lib/db"; // Create this pool file as shown below

export async function GET() {
  const { rows } = await pool.query("SELECT * FROM zones ORDER BY id DESC");
  return NextResponse.json(rows);
}

export async function POST(req) {
  const body = await req.json();
  const { address, latitude, longitude } = body;

  const result = await pool.query(
    "INSERT INTO zones (address, latitude, longitude) VALUES ($1, $2, $3) RETURNING *",
    [address, latitude, longitude]
  );

  return NextResponse.json(result.rows[0]);
}
