// Script to update endpoints for production deployment
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// Database configuration using environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function updateProductionEndpoints() {
  try {
    console.log('🔄 Updating endpoints for production deployment...');
    
    // Production-compatible endpoints that work with Vercel
    const productionEndpoints = [
      // Internal API routes (these work on Vercel)
      {
        name: 'events',
        url: '/api/events?page=1&page_size=200',
        method: 'GET',
        description: 'Internal events API endpoint',
        category: 'api'
      },
      {
        name: 'streams',
        url: '/api/streams',
        method: 'GET',
        description: 'Internal streams API endpoint',
        category: 'api'
      },
      {
        name: 'dahua',
        url: '/api/dahua?page=1&page_size=200',
        method: 'GET',
        description: 'Internal Dahua cameras API endpoint',
        category: 'api'
      },
      {
        name: 'proxy_api',
        url: '/api/proxy',
        method: 'GET',
        description: 'Generic proxy API for upstream services',
        category: 'proxy'
      },
      {
        name: 'image_proxy',
        url: '/api/image-proxy',
        method: 'GET',
        description: 'Image proxy for CORS bypass',
        category: 'proxy'
      },
      // Mock endpoints for development/testing
      {
        name: 'mock_events',
        url: '/api/mock/events',
        method: 'GET',
        description: 'Mock events data for testing',
        category: 'mock'
      },
      {
        name: 'mock_streams',
        url: '/api/mock/streams',
        method: 'GET',
        description: 'Mock streams data for testing',
        category: 'mock'
      },
      {
        name: 'mock_dahua',
        url: '/api/mock/dahua',
        method: 'GET',
        description: 'Mock Dahua cameras data for testing',
        category: 'mock'
      },
      // Configuration endpoints
      {
        name: 'api_base',
        url: process.env.NEXT_PUBLIC_API_BASE || 'https://your-vercel-app.vercel.app',
        method: 'BASE',
        description: 'Base URL for API server',
        category: 'config'
      }
    ];
    
    // Update or insert each endpoint
    for (const endpoint of productionEndpoints) {
      try {
        // Try to update existing endpoint
        const updateResult = await pool.query(
          `UPDATE endpoints 
           SET url = $2, method = $3, description = $4, category = $5, is_active = true, updated_at = CURRENT_TIMESTAMP
           WHERE name = $1 RETURNING id`,
          [endpoint.name, endpoint.url, endpoint.method, endpoint.description, endpoint.category]
        );
        
        if (updateResult.rows.length === 0) {
          // Insert new endpoint if it doesn't exist
          await pool.query(
            `INSERT INTO endpoints (name, url, method, description, category, is_active) 
             VALUES ($1, $2, $3, $4, $5, true)`,
            [endpoint.name, endpoint.url, endpoint.method, endpoint.description, endpoint.category]
          );
          console.log(`✅ Added new endpoint: ${endpoint.name}`);
        } else {
          console.log(`✅ Updated endpoint: ${endpoint.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing endpoint ${endpoint.name}:`, error.message);
      }
    }
    
    // Deactivate old localhost endpoints that won't work in production
    const localhostPatterns = [
      'http://192.168.%',
      'http://localhost%',
      'ws://192.168.%',
      'ws://localhost%'
    ];
    
    for (const pattern of localhostPatterns) {
      await pool.query(
        `UPDATE endpoints SET is_active = false, updated_at = CURRENT_TIMESTAMP 
         WHERE url LIKE $1 AND category IN ('backend', 'websocket')`,
        [pattern]
      );
    }
    
    console.log('✅ Deactivated localhost endpoints for production');
    
    // Show final endpoint status
    const result = await pool.query(
      'SELECT name, url, method, category, is_active FROM endpoints ORDER BY category, name'
    );
    
    console.log('\n📋 Current endpoints status:');
    result.rows.forEach(row => {
      const status = row.is_active ? '✅' : '❌';
      console.log(`   ${status} ${row.name} (${row.category}): ${row.method} ${row.url}`);
    });
    
    console.log('\n🎉 Production endpoints updated successfully!');
    console.log('\n🚀 Ready for Vercel deployment!');
    
  } catch (error) {
    console.error('❌ Error updating production endpoints:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updateProductionEndpoints();