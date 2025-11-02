# Icona Admin Panel (For Flutter Mobile App Bundle)

This admin panel works with the Icona Flutter mobile app. Users shop on mobile, you manage from this web dashboard.

## What's Included

- **Admin Panel** - Web-based platform management dashboard
- **Backend Integration** - Connects to https://api.iconaapp.com

## Features

- User Management (buyers and sellers)
- Order Management & Tracking
- Dispute Resolution System
- Platform Analytics Dashboard
- Category & Subcategory Management
- Live Show Oversight
- Product Inventory Management
- Email & Notifications
- Transaction & Payout Tracking

---

## 🚀 Deploy to DigitalOcean with Custom Domain

### Prerequisites

- DigitalOcean account
- One domain (e.g., `admin.yourstore.com`)
- Basic terminal knowledge

---

## Step 1: Create DigitalOcean Droplet

1. Log in to DigitalOcean → **Create** → **Droplets**
2. Choose **Ubuntu 22.04 LTS**
3. Plan: **Basic $6-12/month** (2-4GB RAM recommended)
4. Choose datacenter region closest to your users
5. Add your SSH key or set root password
6. Click **Create Droplet**
7. Note your **Droplet IP address** (e.g., 147.182.123.45)

---

## Step 2: Connect Domain to Droplet

### Option A: Using DigitalOcean DNS (Recommended)

**At Your Domain Registrar (Namecheap, GoDaddy, etc.):**

1. Log in to your domain provider
2. Find **Nameservers** or **DNS Management**
3. Change to **Custom Nameservers**:
   ```
   ns1.digitalocean.com
   ns2.digitalocean.com
   ns3.digitalocean.com
   ```
4. Save changes (takes 24-48 hours to propagate)

**In DigitalOcean:**

1. Go to **Networking** → **Domains**
2. Add your domain (e.g., `yourstore.com`)
3. Create DNS record:
   - **A Record**: `admin` → Your Droplet IP

Now `admin.yourstore.com` points to your server.

### Option B: Using Your Domain Provider's DNS

At your domain registrar, create this A record:

| Type | Host | Value |
|------|------|-------|
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

## Step 4: Upload and Setup Admin Panel

**Upload this package to your server:**

```bash
# On your local computer, upload the package
scp -r admin-for-flutter/ root@YOUR_DROPLET_IP:/var/www/

# OR use git if you have it in a repository
ssh root@YOUR_DROPLET_IP
cd /var/www
git clone YOUR_REPOSITORY_URL admin-for-flutter
```

**Install dependencies:**

```bash
# On your droplet
cd /var/www/admin-for-flutter
npm install

# Build application
cd admin-app && npm run build && cd ..
```

---

## Step 5: Start Admin Panel with PM2

```bash
cd /var/www/admin-for-flutter/admin-app

# Start admin panel on port 5000
pm2 start npm --name "icona-admin-panel" -- run dev

# Save PM2 configuration
pm2 save

# Make PM2 start on system reboot
pm2 startup systemd
# Copy and run the command it shows you

# Check app is running
pm2 status
```

You should see:

```
┌────┬────────────────────┬─────────┬─────────┬──────────┐
│ id │ name               │ status  │ cpu     │ memory   │
├────┼────────────────────┼─────────┼─────────┼──────────┤
│ 0  │ icona-admin-panel  │ online  │ 0%      │ 45.2mb   │
└────┴────────────────────┴─────────┴─────────┴──────────┘
```

---

## Step 6: Configure Nginx

**Create Nginx configuration:**

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

**Enable configuration:**

```bash
# Remove default site
rm /etc/nginx/sites-enabled/default

# Enable your site
ln -s /etc/nginx/sites-available/admin.yourstore.com /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

---

## Step 7: Add Free SSL Certificate (HTTPS)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d admin.yourstore.com

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose option 2 (redirect HTTP to HTTPS)

# Test auto-renewal
certbot renew --dry-run
```

---

## ✅ Test Your Deployment

Visit your admin panel:

**Admin Panel**: https://admin.yourstore.com

You should see the 🔒 padlock icon (HTTPS enabled)!

---

## How It Works With Flutter App

```
┌─────────────────────┐
│  Flutter Mobile App │  ← Users shop & sell here
│  (iOS + Android)    │
└──────────┬──────────┘
           │
           │ Both connect to same API
           │
           ↓
┌──────────────────────┐
│  Icona Backend API   │
│ api.iconaapp.com     │
└──────────┬───────────┘
           │
           ↑
┌──────────┴──────────┐
│   Admin Web Panel   │  ← You manage platform here
│ admin.yourstore.com │
└─────────────────────┘
```

---

## Useful Commands

### Check App Status
```bash
pm2 status
pm2 logs icona-admin-panel
```

### Restart App
```bash
pm2 restart icona-admin-panel
```

### Update Your App
```bash
cd /var/www/admin-for-flutter
git pull  # If using git

# Rebuild and restart
cd admin-app && npm run build && cd ..
pm2 restart icona-admin-panel
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
systemctl reload nginx
```

---

## Environment Variables (Optional)

If you need to set environment variables:

```bash
# Edit PM2 ecosystem file
nano /var/www/admin-for-flutter/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'icona-admin-panel',
      cwd: '/var/www/admin-for-flutter/admin-app',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
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

**App not starting?**
```bash
pm2 logs
# Check for errors in the logs
```

**502 Bad Gateway?**
```bash
pm2 status  # Make sure app is running
nginx -t    # Test Nginx config
tail -f /var/log/nginx/error.log
```

**DNS not working?**
```bash
# Check DNS propagation
dig admin.yourstore.com

# Wait up to 48 hours for full propagation
```

**SSL certificate issues?**
```bash
certbot certificates  # List certificates
certbot renew  # Manually renew
```

---

## Server Requirements

- **Minimum**: 1GB RAM, 1 CPU, 25GB SSD ($6/month)
- **Recommended**: 2GB RAM, 1 CPU, 50GB SSD ($12/month)
- **High Traffic**: 4GB RAM, 2 CPU, 80GB SSD ($24/month)

---

## Package Contents

```
admin-for-flutter/
├── admin-app/          # Admin panel frontend
├── shared-backend/     # Express server & API routes
├── package.json        # Dependencies
├── run-admin.sh        # Start script
└── README.md          # This file
```

---

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Express.js + Node.js
- UI: Tailwind CSS + shadcn/ui
- External API: Icona API (https://api.iconaapp.com)
