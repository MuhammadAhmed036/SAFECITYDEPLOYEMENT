// setup-postgres.js
// Script to create PostgreSQL database and initialize tables

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// First, connect to PostgreSQL without specifying a database to create the database
const adminConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here',
  // Don't specify database to connect to default 'postgres' database
};

// Configuration for connecting to the safecity database
const dbConfig = {
  ...adminConfig,
  database: process.env.DB_NAME || 'safecity',
};

async function setupPostgreSQL() {
  let adminPool;
  let dbPool;
  
  try {
    console.log('🔄 Connecting to PostgreSQL server...');
    adminPool = new Pool(adminConfig);
    
    // Test connection
    await adminPool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL server successfully');
    
    // Check if database exists
    const dbCheckResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'safecity']
    );
    
    if (dbCheckResult.rows.length === 0) {
      console.log('🔄 Creating safecity database...');
      await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'safecity'}`);
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }
    
    await adminPool.end();
    
    // Now connect to the safecity database and create tables
    console.log('🔄 Connecting to safecity database...');
    dbPool = new Pool(dbConfig);
    
    // Create endpoints table
    console.log('🔄 Creating endpoints table...');
    await dbPool.query(`
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
    console.log('✅ Endpoints table created successfully');
    
    // Check if we need to insert default endpoints
    const countResult = await dbPool.query('SELECT COUNT(*) as count FROM endpoints');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log('🔄 Inserting default endpoints...');
      
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
        await dbPool.query(
          `INSERT INTO endpoints (name, url, method, description, category) 
           VALUES ($1, $2, $3, $4, $5)`,
          [endpoint.name, endpoint.url, endpoint.method, endpoint.description, endpoint.category]
        );
      }
      
      console.log(`✅ Inserted ${defaultEndpoints.length} default endpoints`);
    } else {
      console.log(`✅ Found ${count} existing endpoints`);
    }
    
    console.log('\n🎉 PostgreSQL setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Database: safecity ✅');
    console.log('   - Table: endpoints ✅');
    console.log(`   - Default endpoints: ${count === 0 ? 'inserted' : 'already exist'} ✅`);
    console.log('\n🚀 You can now run: npm run dev');
    
  } catch (error) {
    console.error('❌ Error setting up PostgreSQL:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is installed and running');
    console.error('   2. Check your .env file credentials');
    console.error('   3. Ensure the PostgreSQL user has database creation privileges');
    console.error('   4. Try connecting manually: psql -U postgres -h localhost');
    process.exit(1);
  } finally {
    try {
      if (adminPool) await adminPool.end();
    } catch (e) {
      // Ignore pool cleanup errors
    }
    try {
      if (dbPool) await dbPool.end();
    } catch (e) {
      // Ignore pool cleanup errors
    }
  }
}

// Run the setup
setupPostgreSQL();