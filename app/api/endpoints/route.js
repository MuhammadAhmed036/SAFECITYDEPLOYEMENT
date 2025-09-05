// app/api/endpoints/route.js
import { pool } from '../../../lib/db.js';
import { NextResponse } from 'next/server';

// GET - Fetch all endpoints
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    
    let query = 'SELECT * FROM endpoints';
    const params = [];
    const conditions = [];
    let paramIndex = 1;
    
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (active !== null) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY category, name';
    
    const result = await pool.query(query, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching endpoints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch endpoints' },
      { status: 500 }
    );
  }
}

// POST - Create new endpoint
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, url, method = 'GET', description, category = 'general', is_active = true } = body;
    
    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Name and URL are required' },
        { status: 400 }
      );
    }
    
    const result = await pool.query(
      `INSERT INTO endpoints (name, url, method, description, category, is_active, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
      [name, url, method, description, category, is_active]
    );
    
    const newEndpoint = result.rows[0];
    
    return NextResponse.json({ 
      success: true, 
      data: newEndpoint,
      message: 'Endpoint created successfully' 
    });
  } catch (error) {
    console.error('Error creating endpoint:', error);
    
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return NextResponse.json(
        { success: false, error: 'Endpoint name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create endpoint' },
      { status: 500 }
    );
  }
}