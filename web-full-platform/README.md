# Icona Live Shopping - Web Full Platform

Complete marketplace platform with Admin Panel and Marketplace/Seller Dashboard.

## What's Inside

- **Admin Panel** - Manage your entire platform (users, orders, disputes, inventory)
- **Marketplace** - Buyer shopping + Seller dashboard with live streaming

## 🚀 Deploy to DigitalOcean with Different Domains

### Prerequisites

- DigitalOcean account
- Two domains (e.g., `admin.yourstore.com` and `yourstore.com`)
- Basic terminal knowledge

---

## Step 1: Create DigitalOcean Droplet

1. Log in to DigitalOcean → **Create** → **Droplets**
2. Choose **Ubuntu 22.04 LTS**
3. Plan: **Basic $12/month** (4GB RAM recommended for both apps)
4. Choose datacenter region closest to your users
5. Add your SSH key or set root password
6. Click **Create Droplet**
7. Note your **Droplet IP address** (e.g., 147.182.123.45)

---

## Step 2: Connect Domains to Droplet

### Option A: Using DigitalOcean DNS (Recommended)

**At Your Domain Registrar (Namecheap, GoDaddy, etc.):**

1. Log in to your domain provider
2. Find **Nameservers** settings
3. Change to **Custom Nameservers**:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```
4. Save (takes 24-48 hours to propagate)

**In DigitalOcean:**

1. Go to **Networking** → **Domains**
2. Add your main domain (e.g., `yourstore.com`)
3. Create DNS records:
   - **A Record**: `@` → Your Droplet IP
   - **A Record**: `www` → Your Droplet IP
   - **A Record**: `admin` → Your Droplet IP

### Option B: Using Your Domain Provider's DNS

At your domain registrar, create these A records:

| Type | Host | Value |
|------|------|-------|
| A | @ | Your Droplet IP |
| A | www | Your Droplet IP |
| A | admin | Your Droplet IP |

Wait 1-2 hours for DNS propagation.

---

## Step 3: Install Software on Droplet

**Connect to your droplet:**

```bash
ssh root@YOUR_DROPLET_IP
```

**Install Node.js, Nginx, and PM2:**

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node -v
npm -v

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (web server)
apt install -y nginx

# Configure firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## Step 4: Upload and Setup Your Applications

**Upload this package to your server:**

```bash
# On your local computer, upload the package
scp -r web-full-platform/ root@YOUR_DROPLET_IP:/var/www/

# OR use git if you have it in a repository
ssh root@YOUR_DROPLET_IP
cd /var/www
git clone YOUR_REPOSITORY_URL web-full-platform
```

**Install dependencies:**

```bash
# On your droplet
cd /var/www/web-full-platform
npm install

# Build both applications
cd admin-app && npm run build && cd ..
cd marketplace-app && npm run build && cd ..
```

---

## Step 5: Start Apps with PM2

```bash
cd /var/www/web-full-platform

# Start Admin app on port 5000
cd admin-app
pm2 start npm --name "icona-admin" -- run dev

# Start Marketplace app on port 5001
cd ../marketplace-app
pm2 start npm --name "icona-marketplace" -- run dev

# Save PM2 configuration
cd ..
pm2 save

# Make PM2 start on system reboot
pm2 startup systemd
# Copy and run the command it shows you

# Check both apps are running
pm2 status
```

You should see both apps running:

```
┌────┬─────────────────────┬─────────┬─────────┬──────────┐
│ id │ name                │ status  │ cpu     │ memory   │
├────┼─────────────────────┼─────────┼─────────┼──────────┤
│ 0  │ icona-admin         │ online  │ 0%      │ 45.2mb   │
│ 1  │ icona-marketplace   │ online  │ 0%      │ 52.1mb   │
└────┴─────────────────────┴─────────┴─────────┴──────────┘
```

---

## Step 6: Configure Nginx for Both Domains

**Create Nginx configuration for Admin:**

```bash
nano /etc/nginx/sites-available/admin.yourstore.com
```

Paste this (replace `admin.yourstore.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name admin.yourstore.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Create Nginx configuration for Marketplace:**

```bash
nano /etc/nginx/sites-available/yourstore.com
```

Paste this (replace `yourstore.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourstore.com www.yourstore.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable both configurations:**

```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Enable your sites
ln -s /etc/nginx/sites-available/admin.yourstore.com /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/yourstore.com /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## Step 7: Add Free SSL Certificates (HTTPS)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL for Admin
certbot --nginx -d admin.yourstore.com

# Get SSL for Marketplace
certbot --nginx -d yourstore.com -d www.yourstore.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose option 2 (redirect HTTP to HTTPS)

# Test auto-renewal
certbot renew --dry-run
```

---

## ✅ Test Your Deployment

Visit your websites:

- **Admin Panel**: https://admin.yourstore.com
- **Marketplace**: https://yourstore.com

Both should show the 🔒 padlock icon (HTTPS enabled)!

---

## Useful Commands

### Check App Status
```bash
pm2 status
pm2 logs icona-admin
pm2 logs icona-marketplace
```

### Restart Apps
```bash
pm2 restart icona-admin
pm2 restart icona-marketplace
# Or restart all
pm2 restart all
```

### Update Your Apps
```bash
cd /var/www/web-full-platform
git pull  # If using git

# Rebuild and restart
cd admin-app && npm run build && cd ..
cd marketplace-app && npm run build && cd ..

pm2 restart all
```

### View Nginx Logs
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Check Nginx Status
```bash
systemctl status nginx
nginx -t  # Test configuration
systemctl reload nginx  # Reload without downtime
```

---

## Environment Variables

If you need to set environment variables:

```bash
# Edit PM2 ecosystem file
nano /var/www/web-full-platform/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'icona-admin',
      cwd: '/var/www/web-full-platform/admin-app',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        VITE_ICONA_API_BASE: 'https://api.iconaapp.com'
      }
    },
    {
      name: 'icona-marketplace',
      cwd: '/var/www/web-full-platform/marketplace-app',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        VITE_ICONA_API_BASE: 'https://api.iconaapp.com'
      }
    }
  ]
}
```

Then use:
```bash
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## Troubleshooting

**Apps not starting?**
```bash
pm2 logs
# Check for errors in the logs
```

**502 Bad Gateway?**
```bash
pm2 status  # Make sure apps are running
nginx -t    # Test Nginx config
tail -f /var/log/nginx/error.log
```

**DNS not working?**
```bash
# Check DNS propagation
dig admin.yourstore.com
dig yourstore.com

# Wait up to 48 hours for full propagation
```

**SSL certificate issues?**
```bash
certbot certificates  # List certificates
certbot renew  # Manually renew
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Your Domains                    │
│                                         │
│  admin.yourstore.com  yourstore.com     │
└──────────────┬──────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│          Nginx (Port 80/443)             │
│      Routes traffic by domain            │
└───────────┬─────────────┬────────────────┘
            │             │
    admin → │             │ ← marketplace
            ↓             ↓
┌───────────────┐  ┌─────────────────┐
│  Admin App    │  │ Marketplace App │
│  Port 5000    │  │  Port 5001      │
└───────────────┘  └─────────────────┘
            │             │
            └─────┬───────┘
                  ↓
         ┌────────────────┐
         │ External API   │
         │ iconaapp.com   │
         └────────────────┘
```

---

## Server Requirements

- **Minimum**: 2GB RAM, 1 CPU, 50GB SSD ($12/month)
- **Recommended**: 4GB RAM, 2 CPU, 80GB SSD ($24/month)
- **High Traffic**: 8GB RAM, 4 CPU, 160GB SSD ($48/month)

Choose based on expected user traffic.
