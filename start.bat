@echo off
REM ⚡ Load Balancer Startup Script for Windows
REM This script helps you choose the load balancing method

echo ⚡ Food Fantasy Backend - Load Balancer Setup
echo ==============================================
echo.
echo Choose load balancing method:
echo 1) Node.js Cluster Module (Built-in, Recommended for Development)
echo 2) PM2 Process Manager (Recommended for Production)
echo 3) Single Instance (No load balancing)
echo.
set /p choice="Enter choice [1-3]: "

if "%choice%"=="1" (
    echo ⚡ Starting with Node.js Cluster Module...
    if "%WORKER_COUNT%"=="" set WORKER_COUNT=4
    node cluster.js
) else if "%choice%"=="2" (
    echo ⚡ Starting with PM2...
    where pm2 >nul 2>&1
    if errorlevel 1 (
        echo ❌ PM2 is not installed. Installing...
        npm install -g pm2
    )
    pm2 start ecosystem.config.cjs
    pm2 logs
) else if "%choice%"=="3" (
    echo ⚡ Starting single instance...
    node server.js
) else (
    echo ❌ Invalid choice. Starting with Cluster Module (default)...
    if "%WORKER_COUNT%"=="" set WORKER_COUNT=4
    node cluster.js
)

