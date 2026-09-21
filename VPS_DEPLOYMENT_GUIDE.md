# Billing Narendiraa - VPS Deployment Guide (Ubuntu / Hostinger)

This guide provides step-by-step instructions to deploy the Billing Narendiraa application (React Vite Frontend + Node/Express TypeScript Backend + PM2 + Nginx + MongoDB Atlas) on an Ubuntu VPS under the subdomain `billing.narendiraaenterprises.com` on port `5014`.

---

## 🏗️ Architecture Overview

```
                          Internet (User Request)
                                     │
                                     ▼
                     [ Nginx Web Server (Port 80 / 443 SSL) ]
                        billing.narendiraaenterprises.com
                                     │
                ┌────────────────────┴────────────────────┐
                │                                         │
        Frontend Requests (/ & /assets/*)       Backend API Requests (/api/*)
                │                                         │
                ▼                                         ▼
    Static SPA (/var/www/billing-narendiraa/dist)   Express API (Port 5014 via PM2)
                                                          │
                                                  MongoDB Atlas Cloud
```

---

## 📋 Step 1: DNS Configuration (Do this First)

In your Domain DNS Management (Hostinger / Cloudflare / GoDaddy):
- **Type**: `A`
- **Name / Host**: `billing`
- **Points to / Value**: `<YOUR_VPS_IP_ADDRESS>`
- **TTL**: `Automatic` or `300`

*(This points `billing.narendiraaenterprises.com` to your VPS IP address).*

---

## 💻 Step 2: Initial VPS Server Setup

Connect to your VPS via SSH:
```bash
ssh root@YOUR_VPS_IP
```

Update system packages:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget ufw nginx
```

### Install Node.js (v20 LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should be v20.x or newer
npm -v
```

### Install PM2 (Process Manager):
```bash
sudo npm install -g pm2
```

### Configure Firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 📂 Step 3: Clone Project & Configure Directory

Create the web directory and clone your repository:
```bash
sudo mkdir -p /var/www/billing-narendiraa
sudo chown -R $USER:$USER /var/www/billing-narendiraa
cd /var/www/billing-narendiraa

git clone <YOUR_GIT_REPO_URL> .
```

---

## ⚙️ Step 4: Configure Environment Variables

### 1. Root `.env` (Frontend)
```bash
nano .env
```
Add:
```env
VITE_API_URL=/api
```
*(Save: `Ctrl + O` -> `Enter`, Exit: `Ctrl + X`)*

### 2. Backend `server/.env`
```bash
nano server/.env
```
Add your production configuration:
```env
PORT=5014
NODE_ENV=production
MONGODB_URI=mongodb+srv://heamanthprabhu59_db_user:Heamanth007@cluster0.nyvgk5e.mongodb.net/?appName=Cluster0
CORS_ORIGIN=https://billing.narendiraaenterprises.com
```

---

## 🚀 Step 5: Install Dependencies & Build

```bash
cd /var/www/billing-narendiraa

# Install dependencies for both frontend and backend
npm install
npm --prefix server install

# Build both frontend (dist) and backend (server/dist)
npm run build:all
```

---

## 🔄 Step 6: Start Backend with PM2 (Port 5014)

Start the backend API server using the PM2 configuration:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
*(Run the command output by `pm2 startup` if prompted to enable auto-start on server reboot).*

Check PM2 status & logs:
```bash
pm2 status
pm2 logs billing-narendiraa-api
```

---

## 🌐 Step 7: Configure Nginx Reverse Proxy

Copy the pre-configured Nginx configuration:
```bash
sudo cp nginx/billing-narendiraa.conf /etc/nginx/sites-available/billing-narendiraa
```

Enable the configuration in Nginx:
```bash
sudo ln -sf /etc/nginx/sites-available/billing-narendiraa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Test Nginx configuration for syntax errors:
```bash
sudo nginx -t
```
*(You should see `syntax is ok` and `test is successful`)*

Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🔒 Step 8: Setup Free SSL (HTTPS) with Certbot

Install Certbot and get SSL certificate for `billing.narendiraaenterprises.com`:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d billing.narendiraaenterprises.com
```
Follow prompts (enter email address, agree to terms). Certbot will automatically configure HTTPS redirect and SSL certificates!

---

## 🔍 Step 9: Verify Deployment

1. Check Backend API health directly:
   ```bash
   curl http://127.0.0.1:5014/api/health
   ```
2. Open your browser and navigate to:
   ```
   https://billing.narendiraaenterprises.com
   ```

---

## ⚡ Future Updates (1-Step Deploy)

Whenever you push new updates to GitHub, simply run:
```bash
cd /var/www/billing-narendiraa
bash deploy.sh
```
This script will automatically pull latest changes, install any new dependencies, re-build frontend & backend, and reload PM2 without downtime!
