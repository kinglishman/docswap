#!/bin/bash

# 🚀 DocSwap Deployment for mydocswap.com
# Quick deployment script for your VPS

echo "🚀 Starting DocSwap deployment for mydocswap.com..."

# Check if we have the VPS IP
if [ -z "$1" ]; then
    echo "❌ Please provide your VPS IP address"
    echo "Usage: $0 YOUR_VPS_IP"
    echo "Example: $0 123.456.789.012"
    exit 1
fi

VPS_IP=$1
DOMAIN="mydocswap.com"

echo "📡 VPS IP: $VPS_IP"
echo "🌐 Domain: $DOMAIN"

# Step 1: Copy files to VPS
echo "📁 Copying files to VPS..."
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no -r . root@$VPS_IP:/tmp/docswap/

# Step 2: Run deployment script on VPS
echo "🔧 Running deployment script on VPS..."
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@$VPS_IP "cd /tmp/docswap && chmod +x vps_deploy_script.sh && ./vps_deploy_script.sh $DOMAIN"

echo "✅ Deployment completed!"
echo "🌐 Your site should be available at: https://$DOMAIN"
echo "🔧 Admin panel: https://$DOMAIN/admin"