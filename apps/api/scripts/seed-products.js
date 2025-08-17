const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        currency_code TEXT NOT NULL,
        image TEXT
      );
    `);

    const seedPath = path.join(__dirname, '..', 'seed', 'products.json');
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    let count = 0;
    for (const p of data) {
      await client.query(
        `INSERT INTO products (id, title, description, price, currency_code, image)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET
           title=EXCLUDED.title, description=EXCLUDED.description, price=EXCLUDED.price,
           currency_code=EXCLUDED.currency_code, image=EXCLUDED.image`,
        [
          p.id, p.title || p.name || 'Producto',
          p.description || '', Number.isInteger(p.price) ? p.price : Math.round(Number(p.price)||0),
          p.currency_code || 'COP', (Array.isArray(p.images)&&p.images[0]) || p.image || null
        ]
      );
      count++;
    }
    console.log(`[seed] productos insertados/actualizados: ${count}`);
  } catch (e) {
    console.error('[seed] error:', e);
    process.exitCode = 1;
  } finally {
    client.release(); await pool.end();
  }
}
main();
