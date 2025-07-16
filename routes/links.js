const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all links (public)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, url, created_at 
      FROM links 
      ORDER BY title ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new link (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, url } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Please enter a valid URL' });
    }
    
    const result = await pool.query(`
      INSERT INTO links (title, url) 
      VALUES ($1, $2) 
      RETURNING id, title, url, created_at
    `, [title.trim(), url.trim()]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update link (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;
    
    if (!title || !url) {
      return res.status(400).json({ error: 'Title and URL are required' });
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Please enter a valid URL' });
    }
    
    const result = await pool.query(`
      UPDATE links 
      SET title = $1, url = $2 
      WHERE id = $3 
      RETURNING id, title, url, created_at
    `, [title.trim(), url.trim(), id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete link (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM links 
      WHERE id = $1 
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 