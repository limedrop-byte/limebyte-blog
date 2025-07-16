Welcome to the Limebyte Labs blog platform! This repository contains the foundational codebase that powers our blog. For a comprehensive overview, check out our video walkthrough: https://www.youtube.com/watch?v=R4l2rTSXWhY

Please note that this repository serves as a reference implementation and won't receive ongoing maintenance, as we've forked it to create our production blog

# Limebyte Blog

A modern, lightweight blog platform with newsletter subscription capabilities and a secure admin dashboard. Built using Node.js and PostgreSQL for robust performance and data management. Designed to be extremely lightweight, with a strong focus on content.

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm
- NGINX (for production)

## Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd limebyte
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```bash
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=limebyte_blog
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   NODE_ENV=production
   ```

3. **Set up PostgreSQL:**
   ```bash
   # Create database and user
   sudo -u postgres psql
   CREATE DATABASE limebyte_blog;
   ALTER USER postgres PASSWORD 'your_db_password';
   \q
   ```

4. **Deploy database:**
   ```bash
   npm run deploy
   ```

5. **Set up NGINX (Production):**
   
   A complete NGINX configuration file is included in the repository (`NGINX`). You can use this as a reference or copy the relevant sections to your NGINX config.

   Test and reload NGINX:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Start with PM2 (Production):**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start app
   pm2 start server.js --name "limebyte-blog"
   
   # Save PM2 config
   pm2 save
   
   # Auto-start on reboot
   pm2 startup
   ```

7. **Development mode:**
   ```bash
   npm run dev
   ```

## Usage

- **Blog:** `http://localhost:3000` or `https://yourdomain.com`
- **Admin:** `http://localhost:3000/admin` or `https://yourdomain.com/admin`
- **Default login:** username=`admin`, password=`admin`

## Scripts

- `npm start` - Start the server
- `npm run deploy` - Fresh database deployment
- `npm run migrate` - Run database migrations
- `npm run dev` - Development mode with nodemon

That's it! 🚀 