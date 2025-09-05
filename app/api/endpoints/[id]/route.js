// app/api/endpoints/[id]/route.js
import { pool } from '../../../../lib/db.js';
import { NextResponse } from 'next/server';

// GET - Fetch single endpoint
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    const result = await pool.query('SELECT * FROM endpoints WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch endpoint' },
      { status: 500 }
    );
  }
}

// PUT - Update endpoint
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, method, description, category, is_active } = body;
    
    // Check if endpoint exists
    const existingResult = await pool.query('SELECT * FROM endpoints WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }
    
    // Update endpoint
    const updateResult = await pool.query(
      `UPDATE endpoints 
       SET name = COALESCE($1, name),
           url = COALESCE($2, url),
           method = COALESCE($3, method),
           description = COALESCE($4, description),
           category = COALESCE($5, category),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [name, url, method, description, category, is_active, id]
    );
    
    const updatedEndpoint = updateResult.rows[0];
    
    return NextResponse.json({ 
      success: true, 
      data: updatedEndpoint,
      message: 'Endpoint updated successfully' 
    });
  } catch (error) {
    console.error('Error updating endpoint:', error);
    
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return NextResponse.json(
        { success: false, error: 'Endpoint name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update endpoint' },
      { status: 500 }
    );
  }
}

// DELETE - Delete endpoint
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    // Check if endpoint exists
    const existingResult = await pool.query('SELECT * FROM endpoints WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Endpoint not found' },
        { status: 404 }
      );
    }
    
    // Delete endpoint
    await pool.query('DELETE FROM endpoints WHERE id = $1', [id]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Endpoint deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete endpoint' },
      { status: 500 }
    );
  }
}