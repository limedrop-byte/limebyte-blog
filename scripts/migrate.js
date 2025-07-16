// Load environment variables
require('dotenv').config();

const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Get all SQL files from migrations directory
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure proper order (001, 002, 003, etc.)
    
    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }
    
    // Run each migration
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📂 Running migration: ${file}`);
      
      // Split SQL by semicolons and execute each statement
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement.trim());
        }
      }
      
      console.log(`✅ Completed: ${file}`);
    }

    console.log('\n🎉 All migrations completed successfully!');
    console.log('📋 Database is up to date');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations(); 