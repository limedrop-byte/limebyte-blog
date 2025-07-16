const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Check if IP has already subscribed
router.get('/check-ip', async (req, res) => {
  try {
    // Get IP address from request
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
    
    if (!ipAddress) {
      return res.json({ subscribed: false });
    }
    
    // Check if this IP has already subscribed
    const result = await pool.query(`
      SELECT id FROM subscribers 
      WHERE ip_address = $1 
      LIMIT 1
    `, [ipAddress]);
    
    res.json({ subscribed: result.rows.length > 0 });
    
  } catch (error) {
    console.error('Error checking IP subscription:', error);
    res.json({ subscribed: false }); // Default to not subscribed on error
  }
});

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Get IP address from request
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];

    // Insert email and IP into subscribers table
    await pool.query(`
      INSERT INTO subscribers (email, ip_address) 
      VALUES ($1, $2)
    `, [email.toLowerCase().trim(), ipAddress]);

    res.json({ message: 'Successfully subscribed to newsletter!' });
    
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    // Check if it's a duplicate email error
    if (error.code === '23505') { // PostgreSQL unique violation error code
      return res.status(409).json({ error: 'Email is already subscribed' });
    }
    
    res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
});

// Get all subscribers (admin only)
router.get('/subscribers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, ip_address, created_at 
      FROM subscribers 
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export subscribers as CSV (admin only)
router.get('/subscribers/export', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT email, ip_address, created_at 
      FROM subscribers 
      ORDER BY created_at DESC
    `);
    
    // Create CSV content
    const csvHeader = 'Email,IP Address,Subscribed Date\n';
    const csvContent = result.rows.map(subscriber => {
      const formattedDate = new Date(subscriber.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return `"${subscriber.email}","${subscriber.ip_address || ''}","${formattedDate}"`;
    }).join('\n');
    
    const csv = csvHeader + csvContent;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="newsletter-subscribers.csv"');
    
    res.send(csv);
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete multiple subscribers (admin only)
router.delete('/subscribers', authenticateToken, async (req, res) => {
  try {
    const { subscriberIds } = req.body;
    
    if (!subscriberIds || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return res.status(400).json({ error: 'Subscriber IDs array is required' });
    }
    
    // Validate that all IDs are numbers
    const validIds = subscriberIds.filter(id => Number.isInteger(Number(id)));
    if (validIds.length !== subscriberIds.length) {
      return res.status(400).json({ error: 'All subscriber IDs must be valid numbers' });
    }
    
    // Delete subscribers with the provided IDs
    const placeholders = validIds.map((_, index) => `$${index + 1}`).join(',');
    const query = `DELETE FROM subscribers WHERE id IN (${placeholders}) RETURNING id`;
    
    const result = await pool.query(query, validIds);
    
    res.json({ 
      message: `Successfully deleted ${result.rows.length} subscriber(s)`,
      deletedCount: result.rows.length,
      deletedIds: result.rows.map(row => row.id)
    });
    
  } catch (error) {
    console.error('Error deleting subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 