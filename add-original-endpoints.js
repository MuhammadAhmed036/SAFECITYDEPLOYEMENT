// add-original-endpoints.js
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'safecity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
};

async function addOriginalEndpoints() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('Adding original endpoints from initDb.js...');
    
    // Original endpoints from initDb.js
    const originalEndpoints = [
      // Main API endpoints
      {
        name: 'events',
        url: '/api/events?page=1&page_size=200',
        method: 'GET',
        description: 'Fetch events data from luna-streams API',
        category: 'events'
      },
      {
        name: 'streams',
        url: '/api/streams',
        method: 'GET',
        description: 'Fetch streams data from luna-streams API',
        category: 'streams'
      },
      {
        name: 'dahua',
        url: '/api/dahua?page=1&page_size=200',
        method: 'GET',
        description: 'Fetch Dahua cameras data',
        category: 'cameras'
      },
      {
        name: 'events_ws',
        url: 'ws://192.168.18.70:5000/6/events/ws',
        method: 'WS',
        description: 'WebSocket connection for real-time events',
        category: 'websocket'
      },
      // Direct API endpoints (backend services)
      {
        name: 'events_direct',
        url: 'http://192.168.18.70:5000/6/events',
        method: 'GET',
        description: 'Direct events API endpoint',
        category: 'backend'
      },
      {
        name: 'stream_events_direct',
        url: 'http://192.168.18.70:5000/6/events?page=1&page_size=900',
        method: 'GET',
        description: 'Direct stream events API endpoint for matching with Luna/Dahua',
        category: 'backend'
      },
      {
        name: 'streams_direct',
        url: 'http://192.168.18.70:8080/api/luna-streams/1/streams',
        method: 'GET',
        description: 'Direct luna-streams API endpoint',
        category: 'backend'
      },
      {
        name: 'dahua_direct',
        url: 'http://192.168.18.38:8081/cameras',
        method: 'GET',
        description: 'Direct Dahua cameras API endpoint',
        category: 'backend'
      },
      // Proxy endpoints
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
      // Base URLs for configuration
      {
        name: 'api_base',
        url: 'http://192.168.18.70:5000',
        method: 'BASE',
        description: 'Base URL for main API server',
        category: 'config'
      },
      {
        name: 'streams_base',
        url: 'http://192.168.18.70:8080',
        method: 'BASE',
        description: 'Base URL for luna-streams server',
        category: 'config'
      },
      {
        name: 'dahua_base',
        url: 'http://192.168.18.38:8081',
        method: 'BASE',
        description: 'Base URL for Dahua server',
        category: 'config'
      }
    ];

    let addedCount = 0;
    let updatedCount = 0;

    for (const endpoint of originalEndpoints) {
      try {
        // Check if endpoint already exists
        const existingResult = await pool.query(
          'SELECT id FROM endpoints WHERE name = $1',
          [endpoint.name]
        );

        if (existingResult.rows.length > 0) {
          // Update existing endpoint
          await pool.query(
            `UPDATE endpoints 
             SET url = $2, method = $3, description = $4, category = $5, 
                 is_active = true, updated_at = CURRENT_TIMESTAMP
             WHERE name = $1`,
            [endpoint.name, endpoint.url, endpoint.method, endpoint.description, endpoint.category]
          );
          updatedCount++;
          console.log(`✅ Updated endpoint: ${endpoint.name}`);
        } else {
          // Insert new endpoint
          await pool.query(
            `INSERT INTO endpoints (name, url, method, description, category, is_active) 
             VALUES ($1, $2, $3, $4, $5, true)`,
            [endpoint.name, endpoint.url, endpoint.method, endpoint.description, endpoint.category]
          );
          addedCount++;
          console.log(`✅ Added new endpoint: ${endpoint.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing endpoint ${endpoint.name}:`, error.message);
      }
    }

    // Show final status
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM endpoints WHERE is_active = true');
    const totalActive = totalResult.rows[0].count;

    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${addedCount} endpoints`);
    console.log(`🔄 Updated: ${updatedCount} endpoints`);
    console.log(`📈 Total active endpoints: ${totalActive}`);
    console.log('\n🎉 Original endpoints from initDb.js have been successfully added!');

  } catch (error) {
    console.error('❌ Error adding original endpoints:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
addOriginalEndpoints().catch(console.error);