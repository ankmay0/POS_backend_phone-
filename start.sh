#!/bin/bash

# ⚡ Load Balancer Startup Script
# This script helps you choose the load balancing method

echo "⚡ Food Fantasy Backend - Load Balancer Setup"
echo "=============================================="
echo ""
echo "Choose load balancing method:"
echo "1) Node.js Cluster Module (Built-in, Recommended for Development)"
echo "2) PM2 Process Manager (Recommended for Production)"
echo "3) Single Instance (No load balancing)"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
  1)
    echo "⚡ Starting with Node.js Cluster Module..."
    WORKER_COUNT=${WORKER_COUNT:-4} node cluster.js
    ;;
  2)
    echo "⚡ Starting with PM2..."
    if ! command -v pm2 &> /dev/null; then
      echo "❌ PM2 is not installed. Installing..."
      npm install -g pm2
    fi
    pm2 start ecosystem.config.cjs
    pm2 logs
    ;;
  3)
    echo "⚡ Starting single instance..."
    node server.js
    ;;
  *)
    echo "❌ Invalid choice. Starting with Cluster Module (default)..."
    WORKER_COUNT=${WORKER_COUNT:-4} node cluster.js
    ;;
esac

