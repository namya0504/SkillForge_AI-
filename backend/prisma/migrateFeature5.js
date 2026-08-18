import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Executing Feature 5 & 6 database migration for roadmaps table...');
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roadmaps (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_role_title TEXT NOT NULL,
      gap_analysis TEXT NOT NULL,
      milestones TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Roadmap DDL SQL executed successfully!');
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log('Current Database Tables:', res.rows.map(r => r.table_name));
  await pool.end();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
