// Load environment variables
require('dotenv').config();

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

async function deployFresh() {
  try {
    console.log('🚀 FRESH DEPLOY - MY BLOG DATABASE');
    console.log('🗑️  Dropping ALL existing tables...');
    
    // Drop EVERYTHING - no mercy
    await pool.query(`DROP TABLE IF EXISTS posts CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS users CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS links CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS subscribers CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS settings CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS site_settings CASCADE;`);
    
    console.log('✅ All tables nuked');
    
    console.log('🏗️  Creating complete database structure...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        display_name VARCHAR(255)
      );
    `);
    
    // Create posts table with ALL features
    await pool.query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        slug VARCHAR(255),
        view_count INTEGER DEFAULT 0 NOT NULL,
        pinned BOOLEAN DEFAULT FALSE NOT NULL
      );
    `);
    
    // Create links table
    await pool.query(`
      CREATE TABLE links (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create subscribers table
    await pool.query(`
      CREATE TABLE subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET
      );
    `);
    
    // Create settings table
    await pool.query(`
      CREATE TABLE settings (
        id SERIAL PRIMARY KEY,
        site_title VARCHAR(255) DEFAULT 'My Blog',
        footer_text TEXT DEFAULT 'Building the future, one commit at a time.',
        site_description TEXT DEFAULT 'Welcome to my blog!',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create site_settings table (key-value pairs)
    await pool.query(`
      CREATE TABLE site_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ All tables created');
    
    console.log('🔗 Adding constraints and indexes...');
    
    // Create unique constraints
    await pool.query(`ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);`);
    await pool.query(`ALTER TABLE posts ADD CONSTRAINT posts_slug_key UNIQUE (slug);`);
    await pool.query(`ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_key UNIQUE (email);`);
    await pool.query(`ALTER TABLE site_settings ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);`);
    
    // Create indexes for posts
    await pool.query(`CREATE INDEX idx_posts_slug ON posts(slug);`);
    await pool.query(`CREATE INDEX idx_posts_pinned ON posts(pinned);`);
    
    // Create indexes for subscribers
    await pool.query(`CREATE INDEX idx_subscribers_ip_address ON subscribers(ip_address);`);
    
    console.log('✅ All constraints and indexes added');
    
    console.log('👤 Creating admin user...');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin', 10);
    await pool.query(`
      INSERT INTO users (username, password, display_name) 
      VALUES ('admin', $1, 'Admin')
    `, [hashedPassword]);
    
    console.log('⚙️  Inserting default settings...');
    
    // Insert into settings table
    await pool.query(`
      INSERT INTO settings (site_title, footer_text, site_description) 
      VALUES (
        'My Blog',
        'Building the future, one commit at a time.',
        'Welcome to my blog!'
      )
    `);
    
    // Insert into site_settings table (key-value pairs)
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value) VALUES
      ('site_title', 'My Blog'),
      ('footer_text', 'Building the future, one commit at a time.'),
      ('site_description', 'Welcome to my blog!')
    `);
    
    console.log('🎯 Adding some sample data...');
    
    // Add a sample post
    await pool.query(`
      INSERT INTO posts (subject, message, slug, author_id, view_count) 
      VALUES (
        'Welcome to My Blog',
        '<p>This is your first post! The view count and sorting features are ready to go.</p><p>You can now sort by date or views, and each post tracks how many times it''s been viewed.</p>',
        '123456',
        1,
        5
      )
    `);
    
    console.log('\n🎉 FRESH DEPLOY COMPLETE!');
    console.log('📊 Database Statistics:');
    console.log('   - 6 tables created');
    console.log('   - Admin user ready');
    console.log('   - Settings configured');
    console.log('   - Sample post added');
    console.log('   - View counting enabled');
    console.log('   - Post pinning ready');
    console.log('   - Newsletter IP tracking enabled');
    console.log('   - Sorting ready');
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin');
    
    console.log('\n🚀 Ready to launch: npm start');
    
  } catch (error) {
    console.error('❌ DEPLOY FAILED:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deployFresh(); 