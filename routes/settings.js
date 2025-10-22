const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get site settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT site_title, footer_text, site_description FROM settings LIMIT 1');
    
    // Get view count display setting
    const viewCountResult = await pool.query(`
      SELECT setting_value FROM site_settings 
      WHERE setting_key = 'show_view_count' 
      LIMIT 1
    `);
    
    const showViewCount = viewCountResult.rows.length > 0 ? 
      viewCountResult.rows[0].setting_value === 'true' : true; // Default to true
    
    // Get tracking script setting
    const trackingScriptResult = await pool.query(`
      SELECT setting_value FROM site_settings 
      WHERE setting_key = 'tracking_script' 
      LIMIT 1
    `);
    
    const trackingScript = trackingScriptResult.rows.length > 0 ? 
      trackingScriptResult.rows[0].setting_value : ''; // Default to empty
    
    if (result.rows.length === 0) {
      // If no settings exist, return defaults
      return res.json({ 
        site_title: 'My Blog',
        footer_text: 'Building the future, one commit at a time.',
        site_description: 'Welcome to my blog!',
        show_view_count: showViewCount,
        tracking_script: trackingScript
      });
    }
    
    res.json({
      ...result.rows[0],
      show_view_count: showViewCount,
      tracking_script: trackingScript
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update site settings (admin only)
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { site_title, footer_text, site_description, show_view_count, tracking_script } = req.body;

    if (!site_title || !site_title.trim()) {
      return res.status(400).json({ error: 'Site title is required' });
    }

    // Set defaults for optional fields
    const footerText = footer_text || 'Building the future, one commit at a time.';
    const siteDescription = site_description || 'Welcome to my blog!';
    const showViewCount = show_view_count !== undefined ? show_view_count : true;
    const trackingScript = tracking_script || '';

    // Check if settings row exists
    const existingResult = await pool.query('SELECT id FROM settings LIMIT 1');
    
    if (existingResult.rows.length === 0) {
      // Insert new settings row
      const result = await pool.query(`
        INSERT INTO settings (site_title, footer_text, site_description) 
        VALUES ($1, $2, $3) 
        RETURNING site_title, footer_text, site_description
      `, [site_title.trim(), footerText.trim(), siteDescription.trim()]);
      
      // Update or insert view count setting
      await pool.query(`
        INSERT INTO site_settings (setting_key, setting_value) 
        VALUES ('show_view_count', $1)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [showViewCount.toString()]);
      
      // Update or insert tracking script setting
      await pool.query(`
        INSERT INTO site_settings (setting_key, setting_value) 
        VALUES ('tracking_script', $1)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [trackingScript]);
      
      res.json({
        message: 'Settings updated successfully',
        settings: {
          ...result.rows[0],
          show_view_count: showViewCount,
          tracking_script: trackingScript
        }
      });
    } else {
      // Update existing settings
      const result = await pool.query(`
        UPDATE settings 
        SET site_title = $1, footer_text = $2, site_description = $3
        RETURNING site_title, footer_text, site_description
      `, [site_title.trim(), footerText.trim(), siteDescription.trim()]);
      
      // Update or insert view count setting
      await pool.query(`
        INSERT INTO site_settings (setting_key, setting_value) 
        VALUES ('show_view_count', $1)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [showViewCount.toString()]);
      
      // Update or insert tracking script setting
      await pool.query(`
        INSERT INTO site_settings (setting_key, setting_value) 
        VALUES ('tracking_script', $1)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [trackingScript]);
      
      res.json({
        message: 'Settings updated successfully',
        settings: {
          ...result.rows[0],
          show_view_count: showViewCount,
          tracking_script: trackingScript
        }
      });
    }

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 