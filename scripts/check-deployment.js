#!/usr/bin/env node

/**
 * Health check script for deployment verification
 * Run with: node scripts/check-deployment.js
 */

const https = require('https');
const http = require('http');

// Configuration - update these with your URLs
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-app.netlify.app';
const BACKEND_URL = process.env.BACKEND_URL || 'https://your-app.railway.app';

console.log('🔍 Checking SatyaCoaching deployment health...\n');

// Helper function to make HTTP requests
function checkEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      console.log(`✅ ${url} - Status: ${res.statusCode}`);
      if (res.statusCode === expectedStatus) {
        resolve({ url, status: res.statusCode, success: true });
      } else {
        resolve({ url, status: res.statusCode, success: false });
      }
    });

    req.on('error', (error) => {
      console.log(`❌ ${url} - Error: ${error.message}`);
      resolve({ url, error: error.message, success: false });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`⏰ ${url} - Timeout`);
      resolve({ url, error: 'Timeout', success: false });
    });
  });
}

async function runHealthCheck() {
  const checks = [
    // Frontend checks
    checkEndpoint(FRONTEND_URL),
    checkEndpoint(`${FRONTEND_URL}/manifest.json`),
    
    // Backend API checks
    checkEndpoint(`${BACKEND_URL}/api/health`),
    checkEndpoint(`${BACKEND_URL}/api/auth/status`, 401), // Should return 401 when not authenticated
  ];

  console.log('Running health checks...\n');
  
  const results = await Promise.all(checks);
  
  console.log('\n📊 Health Check Results:');
  console.log('=' .repeat(50));
  
  let allHealthy = true;
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.url}`);
    if (!result.success) {
      allHealthy = false;
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
  });
  
  console.log('\n🎯 Overall Status:', allHealthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED');
  
  if (!allHealthy) {
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check Netlify deployment logs');
    console.log('2. Check Railway application logs');
    console.log('3. Verify environment variables are set correctly');
    console.log('4. Ensure API proxy in netlify.toml points to correct Railway URL');
    console.log('5. Check CORS settings in Railway backend');
  } else {
    console.log('\n🎉 All systems operational! Your deployment looks good.');
  }
}

// Test environment variable parsing
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`Backend URL: ${BACKEND_URL}`);
console.log('');

// Run the health check
runHealthCheck().catch(console.error);