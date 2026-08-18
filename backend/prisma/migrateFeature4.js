import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Executing Feature 4 database migration...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles_reference (
      id TEXT PRIMARY KEY,
      title TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL DEFAULT 'Software Development',
      is_popular BOOLEAN NOT NULL DEFAULT false,
      description TEXT,
      required_skills TEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role_id TEXT REFERENCES roles_reference(id) ON DELETE SET NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_target_role TEXT;
  `);

  console.log('Migration SQL executed successfully!');
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Current Database Tables:', res.rows.map(r => r.table_name));
  await pool.end();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
