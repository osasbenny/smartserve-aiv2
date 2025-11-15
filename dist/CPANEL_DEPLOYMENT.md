# SmartServe AI - cPanel Deployment Guide

This guide provides step-by-step instructions for deploying SmartServe AI on a cPanel-based hosting environment.

## Prerequisites

- cPanel account with Node.js support
- MySQL database access
- SSH access to your server
- Domain name (optional but recommended)
- Node.js 18+ installed on the server

## Step 1: Upload Files to cPanel

### Via File Manager
1. Log in to cPanel
2. Navigate to **File Manager**
3. Create a new directory: `smartserve-ai` or `public_html/smartserve-ai`
4. Upload all files from the `dist` directory to this folder

### Via SSH
```bash
# Connect to your server
ssh username@your-domain.com

# Navigate to your web root
cd public_html

# Create application directory
mkdir smartserve-ai
cd smartserve-ai

# Upload files (use SCP or git clone)
git clone https://github.com/osasbenny/smartserve-aiv2.git .
```

## Step 2: Install Dependencies

```bash
# Navigate to application directory
cd ~/public_html/smartserve-ai

# Install Node.js dependencies
npm install
# or
pnpm install

# If pnpm is not installed:
npm install -g pnpm
pnpm install
```

## Step 3: Configure Environment Variables

1. Copy the environment template:
```bash
cp ENV_TEMPLATE.txt .env
```

2. Edit `.env` with your actual values:
```bash
nano .env
```

3. Update the following critical variables:
   - `DATABASE_URL`: Your MySQL connection string
   - `JWT_SECRET`: Generate a secure random string (min 32 chars)
   - `STRIPE_SECRET_KEY`: Your Stripe API key
   - `VITE_STRIPE_PUBLISHABLE_KEY`: Your Stripe public key
   - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
   - `VITE_APP_ID`: Your Manus OAuth app ID

4. Save and exit (Ctrl+X, then Y, then Enter)

5. Set proper file permissions:
```bash
chmod 600 .env
chmod 755 app.js
```

## Step 4: Create MySQL Database

### Via cPanel
1. Log in to cPanel
2. Go to **MySQL Databases**
3. Create a new database (e.g., `smartserve_ai`)
4. Create a new user with a strong password
5. Add the user to the database with all privileges
6. Note the connection details for your `.env` file

### Via SSH
```bash
mysql -u root -p
CREATE DATABASE smartserve_ai;
CREATE USER 'smartserve_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON smartserve_ai.* TO 'smartserve_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 5: Run Database Migrations

```bash
cd ~/public_html/smartserve-ai

# Push database schema
pnpm db:push
```

This will create all necessary tables in your MySQL database.

## Step 6: Configure Node.js Application in cPanel

### Using cPanel's Node.js Manager

1. Log in to cPanel
2. Navigate to **Node.js Selector** (or **Node.js Manager**)
3. Click **Create Application**
4. Configure:
   - **Node.js version**: 18.x or higher
   - **Application root**: `/home/username/public_html/smartserve-ai`
   - **Application startup file**: `app.js`
   - **Application URL**: Your domain or subdomain
   - **Port**: 3000 (or any available port)

5. Click **Create**

### Manual Configuration (if Node.js Manager not available)

Create a `.htaccess` file in your `public_html` directory:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTP_HOST} ^yourdomain.com$ [OR]
  RewriteCond %{HTTP_HOST} ^www.yourdomain.com$
  RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
</IfModule>
```

## Step 7: Start the Application

### Via cPanel Node.js Manager
Click **Start** in the Node.js Manager interface.

### Via SSH
```bash
cd ~/public_html/smartserve-ai

# Start the application
npm start
# or
node app.js

# For background execution, use PM2:
npm install -g pm2
pm2 start app.js --name "smartserve-ai"
pm2 startup
pm2 save
```

## Step 8: Verify Installation

1. Visit your domain in a browser
2. You should see the SmartServe AI landing page
3. Check the application logs for any errors

### View Logs
```bash
# Via cPanel Node.js Manager
# Logs are visible in the manager interface

# Via SSH
tail -f ~/public_html/smartserve-ai/logs/app.log
```

## Step 9: Configure SSL Certificate

1. In cPanel, go to **AutoSSL** or **Let's Encrypt**
2. Install a free SSL certificate for your domain
3. Update your `.env` file if using HTTPS:
   - Ensure `VITE_OAUTH_PORTAL_URL` uses `https://`
   - Update any webhook URLs to use `https://`

## Step 10: Set Up Stripe Webhooks

1. Log in to Stripe Dashboard
2. Go to **Developers** → **Webhooks**
3. Add endpoint:
   - **URL**: `https://yourdomain.com/api/stripe/webhook`
   - **Events**: Select all payment-related events
4. Copy the webhook secret and add to `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

## Troubleshooting

### Application won't start
- Check `.env` file exists and has correct values
- Verify Node.js version: `node --version`
- Check error logs in cPanel Node.js Manager
- Ensure database connection is working

### Database connection errors
```bash
# Test MySQL connection
mysql -u smartserve_user -p -h localhost smartserve_ai
```

### Port already in use
- Change the PORT in `.env` to an available port
- Restart the application

### Static files not loading
- Ensure `public` directory exists
- Check file permissions: `chmod -R 755 public`
- Verify `.htaccess` configuration

### CORS errors
- Update CORS settings in `server/_core/index.ts`
- Add your domain to allowed origins

## Maintenance

### Updating the application
```bash
cd ~/public_html/smartserve-ai

# Pull latest changes
git pull origin main

# Install new dependencies
pnpm install

# Run migrations
pnpm db:push

# Restart application
pm2 restart smartserve-ai
```

### Backup
```bash
# Backup database
mysqldump -u smartserve_user -p smartserve_ai > backup.sql

# Backup application files
tar -czf smartserve-ai-backup.tar.gz ~/public_html/smartserve-ai
```

### Monitor application
```bash
# Using PM2
pm2 monit

# View logs
pm2 logs smartserve-ai
```

## Performance Optimization

### Enable Gzip Compression
Add to `.htaccess`:
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>
```

### Enable Caching
```apache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Database Optimization
```bash
# Connect to MySQL
mysql -u smartserve_user -p smartserve_ai

# Optimize tables
OPTIMIZE TABLE users, businesses, agents, clients, chatMessages;
```

## Security Checklist

- [ ] Change default passwords
- [ ] Set `.env` file permissions to 600
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Monitor error logs
- [ ] Keep Node.js updated
- [ ] Use strong JWT_SECRET
- [ ] Enable Stripe webhook verification
- [ ] Configure CORS properly

## Support & Resources

- [cPanel Documentation](https://documentation.cpanel.net/)
- [Node.js on cPanel](https://documentation.cpanel.net/display/68Docs/Node.js)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [GitHub Repository](https://github.com/osasbenny/smartserve-aiv2)

## Next Steps

1. Test all features in production
2. Monitor application performance
3. Set up automated backups
4. Configure email notifications
5. Monitor Stripe transactions
6. Track analytics and metrics

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**Status**: Production Ready
