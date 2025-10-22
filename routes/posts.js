const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to generate random 6-digit number slug
function generateRandomSlug() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to ensure unique random slug
async function ensureUniqueRandomSlug() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const slug = generateRandomSlug();
    const result = await pool.query('SELECT id FROM posts WHERE slug = $1', [slug]);
    
    if (result.rows.length === 0) {
      return slug;
    }
    
    attempts++;
  }
  
  // Fallback to timestamp-based if we somehow can't find a unique random number
  return Date.now().toString().slice(-6);
}

// Get all posts (public)
router.get('/', async (req, res) => {
  try {
    const { search, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    let query = `
      SELECT p.*, COALESCE(u.display_name, u.username, 'Unknown') as author 
      FROM posts p 
      LEFT JOIN users u ON p.author_id = u.id 
    `;
    let params = [];
    
    if (search) {
      query += ` WHERE p.subject ILIKE $1 `;
      params.push(`%${search}%`);
    }
    
    // Add sorting - always prioritize pinned posts first
    let orderBy = 'p.pinned DESC'; // Pinned posts first
    
    if (sortBy === 'date') {
      orderBy += sortOrder === 'asc' ? ', p.created_at ASC' : ', p.created_at DESC';
    } else if (sortBy === 'views') {
      orderBy += sortOrder === 'asc' ? ', p.view_count ASC, p.created_at DESC' : ', p.view_count DESC, p.created_at DESC';
    } else {
      orderBy += ', p.created_at DESC'; // default fallback
    }
    
    query += ` ORDER BY ${orderBy}`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single post by slug (public)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Try to find by slug first, fallback to ID for backwards compatibility
    let query = `
      SELECT p.*, COALESCE(u.display_name, u.username, 'Unknown') as author 
      FROM posts p 
      LEFT JOIN users u ON p.author_id = u.id 
      WHERE p.slug = $1
    `;
    let result = await pool.query(query, [slug]);
    
    // If not found by slug and slug is numeric, try by ID (backwards compatibility)
    if (result.rows.length === 0 && /^\d+$/.test(slug)) {
      query = `
        SELECT p.*, COALESCE(u.display_name, u.username, 'Unknown') as author 
        FROM posts p 
        LEFT JOIN users u ON p.author_id = u.id 
        WHERE p.id = $1
      `;
      result = await pool.query(query, [parseInt(slug)]);
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.rows[0];
    
    // Increment view count
    await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = $1', [post.id]);
    
    // Update the view count in the response
    post.view_count = (post.view_count || 0) + 1;
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new post (protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, message, embed_id } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Generate unique random slug
    const slug = await ensureUniqueRandomSlug();

    const result = await pool.query(`
      INSERT INTO posts (subject, message, slug, author_id, embed_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [subject, message, slug, req.user.id, embed_id || null]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update post (protected) - can accept either ID or slug
router.put('/:identifier', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;
    const { subject, message, embed_id } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Find post by slug first, fallback to ID for backwards compatibility
    let slugResult = await pool.query('SELECT * FROM posts WHERE slug = $1', [identifier]);
    let post = slugResult.rows[0];
    
    // If not found by slug and identifier is numeric, try by ID (backwards compatibility)
    if (!post && /^\d+$/.test(identifier)) {
      const idResult = await pool.query('SELECT * FROM posts WHERE id = $1', [parseInt(identifier)]);
      post = idResult.rows[0];
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Keep the existing slug - never change it to avoid broken links
    const slug = post.slug;

    const result = await pool.query(`
      UPDATE posts 
      SET subject = $1, message = $2, slug = $3, embed_id = $4, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $5 
      RETURNING *
    `, [subject, message, slug, embed_id || null, post.id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle pin status (protected) - can accept either ID or slug
router.patch('/:identifier/pin', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find post by slug first, fallback to ID for backwards compatibility
    let slugResult = await pool.query('SELECT * FROM posts WHERE slug = $1', [identifier]);
    let post = slugResult.rows[0];
    
    // If not found by slug and identifier is numeric, try by ID (backwards compatibility)
    if (!post && /^\d+$/.test(identifier)) {
      const idResult = await pool.query('SELECT * FROM posts WHERE id = $1', [parseInt(identifier)]);
      post = idResult.rows[0];
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Toggle the pinned status
    const newPinnedStatus = !post.pinned;
    
    const result = await pool.query(`
      UPDATE posts 
      SET pinned = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `, [newPinnedStatus, post.id]);

    res.json({ 
      message: `Post ${newPinnedStatus ? 'pinned' : 'unpinned'} successfully`,
      post: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete post (protected) - can accept either ID or slug
router.delete('/:identifier', authenticateToken, async (req, res) => {
  try {
    const { identifier } = req.params;

    // Find post by slug first, fallback to ID for backwards compatibility
    let slugResult = await pool.query('SELECT * FROM posts WHERE slug = $1', [identifier]);
    let post = slugResult.rows[0];
    
    // If not found by slug and identifier is numeric, try by ID (backwards compatibility)
    if (!post && /^\d+$/.test(identifier)) {
      const idResult = await pool.query('SELECT * FROM posts WHERE id = $1', [parseInt(identifier)]);
      post = idResult.rows[0];
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [post.id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 