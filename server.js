// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const newsletterRoutes = require('./routes/newsletter');
const linksRoutes = require('./routes/links');
const settingsRoutes = require('./routes/settings');
const databaseRoutes = require('./routes/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy to get real IP addresses
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/database', databaseRoutes);

// Route handlers for frontend pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

app.get('/post/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'post.html'));
});

// Handle 404s
app.use((req, res) => {
  res.status(404).send(`
    <html>
      <head>
        <title>404 - Page Not Found</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            text-align: center; 
            padding: 50px; 
            color: #374151; 
          }
          h1 { font-size: 3rem; font-weight: 300; margin-bottom: 1rem; }
          a { color: #6b7280; text-decoration: none; }
          a:hover { color: #1f2937; }
        </style>
      </head>
      <body>
        <h1>404</h1>
        <p>Page not found</p>
        <a href="/">← Back to Articles</a>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  // Get local IP address
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'localhost';
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
  }
  
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`\n📱 Local access:`);
  console.log(`   Blog: http://localhost:${PORT}`);
  console.log(`   Admin: http://localhost:${PORT}/admin`);
  console.log(`\n🌐 LAN access:`);
  console.log(`   Blog: http://${localIP}:${PORT}`);
  console.log(`   Admin: http://${localIP}:${PORT}/admin`);
  console.log(`\n💡 Share this URL with others on your network!`);
  console.log(`\nTo set up the database, run: npm run deploy`);
  console.log(`Default admin credentials: username=admin, password=admin`);
}); 