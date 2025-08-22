// apps/api/scripts/init-orders.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        items JSON NOT NULL,
        amount INTEGER NOT NULL,
        currency_code TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        provider TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('[init-orders] ok');
  } catch (e) {
    console.error('[init-orders] error:', e);
    process.exitCode = 1;
  } finally {
    client.release(); await pool.end();
  }
}
main();
