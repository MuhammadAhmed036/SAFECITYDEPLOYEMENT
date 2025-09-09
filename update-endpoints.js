import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'safecity',
  user: 'postgres',
  password: '1234'
});

async function updateEndpoints() {
  try {
    // Update Dahua direct endpoint
    await pool.query(
      "UPDATE endpoints SET url = $1 WHERE name = $2",
      ['http://192.168.18.28:14001/cameras', 'dahua_direct']
    );
    
    // Update Dahua base endpoint
    await pool.query(
      "UPDATE endpoints SET url = $1 WHERE name = $2",
      ['http://192.168.18.28:14001', 'dahua_base']
    );
    
    console.log('Updated Dahua endpoints successfully');
    
    // Show current endpoints
    const result = await pool.query(
      "SELECT name, url FROM endpoints WHERE name LIKE '%dahua%' OR name LIKE '%streams%' ORDER BY name"
    );
    
    console.log('\nCurrent endpoints:');
    result.rows.forEach(row => {
      console.log(`${row.name}: ${row.url}`);
    });
    
  } catch (error) {
    console.error('Error updating endpoints:', error.message);
  } finally {
    await pool.end();
  }
}

updateEndpoints();