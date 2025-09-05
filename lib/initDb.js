// lib/initDb.js
import { Pool } from 'pg';

// PostgreSQL connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'safecity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
};

export async function initializeDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    // Create endpoints table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        url TEXT NOT NULL,
        method VARCHAR(10) DEFAULT 'GET',
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default endpoints if table is empty
    const countResult = await pool.query('SELECT COUNT(*) as count FROM endpoints');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      const defaultEndpoints = [
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

      for (const endpoint of defaultEndpoints) {
        await pool.query(
          `INSERT INTO endpoints (name, url, method, description, category) 
           VALUES ($1, $2, $3, $4, $5)`,
          [endpoint.name, endpoint.url, endpoint.method, endpoint.description, endpoint.category]
        );
      }
    }

    console.log('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

export async function getDatabase() {
  return new Pool(dbConfig);
}