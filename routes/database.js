const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/json') {
            cb(null, true);
        } else {
            cb(new Error('Only JSON files are allowed'), false);
        }
    }
});

// Export database as JSON
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            tables: {}
        };

        // Export all main tables
        const tablesToExport = ['users', 'posts', 'subscribers', 'links', 'settings'];
        
        for (const table of tablesToExport) {
            try {
                const result = await pool.query(`SELECT * FROM ${table} ORDER BY id`);
                exportData.tables[table] = result.rows;
            } catch (error) {
                console.warn(`Warning: Could not export table ${table}:`, error.message);
                exportData.tables[table] = [];
            }
        }

        // Set headers for file download
        const filename = `limebyte_backup_${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.json(exportData);
    } catch (error) {
        console.error('Database export error:', error);
        res.status(500).json({ error: 'Failed to export database' });
    }
});

// Import database from JSON
router.post('/import', authenticateToken, upload.single('backup'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No backup file uploaded' });
        }

        let importData;
        try {
            importData = JSON.parse(req.file.buffer.toString());
        } catch (error) {
            return res.status(400).json({ error: 'Invalid JSON file' });
        }

        // Validate the backup file structure
        if (!importData.tables || typeof importData.tables !== 'object') {
            return res.status(400).json({ error: 'Invalid backup file format' });
        }

        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Clear existing data (except admin user)
            await client.query('DELETE FROM posts WHERE id > 0');
            await client.query('DELETE FROM subscribers WHERE id > 0');
            await client.query('DELETE FROM links WHERE id > 0');
            await client.query('DELETE FROM settings WHERE id > 1'); // Keep first settings row
            
            // Import data table by table
            const stats = {
                users: 0,
                posts: 0,
                subscribers: 0,
                links: 0,
                settings: 0
            };

            // Import posts
            if (importData.tables.posts && Array.isArray(importData.tables.posts)) {
                for (const post of importData.tables.posts) {
                    await client.query(`
                        INSERT INTO posts (subject, message, slug, author_id, view_count, pinned, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (slug) DO UPDATE SET
                        subject = EXCLUDED.subject,
                        message = EXCLUDED.message,
                        view_count = EXCLUDED.view_count,
                        pinned = EXCLUDED.pinned,
                        updated_at = EXCLUDED.updated_at
                    `, [
                        post.subject,
                        post.message,
                        post.slug,
                        post.author_id || 1, // Default to admin user
                        post.view_count || 0,
                        post.pinned || false, // Default to unpinned
                        post.created_at,
                        post.updated_at
                    ]);
                    stats.posts++;
                }
            }

            // Import subscribers
            if (importData.tables.subscribers && Array.isArray(importData.tables.subscribers)) {
                for (const subscriber of importData.tables.subscribers) {
                    await client.query(`
                        INSERT INTO subscribers (email, ip_address, created_at)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (email) DO NOTHING
                    `, [
                        subscriber.email,
                        subscriber.ip_address,
                        subscriber.created_at
                    ]);
                    stats.subscribers++;
                }
            }

            // Import links
            if (importData.tables.links && Array.isArray(importData.tables.links)) {
                for (const link of importData.tables.links) {
                    await client.query(`
                        INSERT INTO links (title, url, created_at)
                        VALUES ($1, $2, $3)
                    `, [
                        link.title,
                        link.url,
                        link.created_at
                    ]);
                    stats.links++;
                }
            }

            // Import settings (update existing)
            if (importData.tables.settings && Array.isArray(importData.tables.settings) && importData.tables.settings.length > 0) {
                const settings = importData.tables.settings[0]; // Use first settings record
                await client.query(`
                    UPDATE settings 
                    SET site_title = $1, footer_text = $2, site_description = $3, updated_at = CURRENT_TIMESTAMP
                    WHERE id = 1
                `, [
                    settings.site_title || 'My Blog',
                    settings.footer_text || 'Building the future, one commit at a time.',
                    settings.site_description || 'No expectations, just building weird stuff for fun.'
                ]);
                stats.settings = 1;
            }

            await client.query('COMMIT');

            res.json({
                message: 'Database imported successfully',
                stats: stats,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Database import error:', error);
        res.status(500).json({ error: 'Failed to import database: ' + error.message });
    }
});

module.exports = router; 