require('dotenv').config();
const pool = require('../config/database');

async function checkDatabaseStructure() {
  try {
    console.log('🔍 CHECKING DATABASE STRUCTURE');
    console.log('================================\n');

    // List all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 TABLES FOUND:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    console.log('');

    // Check each table's columns
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;
      
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [tableName]);

      console.log(`🗂️  TABLE: ${tableName.toUpperCase()}`);
      console.log('   Columns:');
      columnsResult.rows.forEach(col => {
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });
      console.log('');
    }

    // Check indexes
    const indexesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    console.log('🔗 INDEXES:');
    indexesResult.rows.forEach(idx => {
      console.log(`   ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n✅ Database structure check complete!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseStructure(); 