#!/usr/bin/env node

/**
 * Bundle Analyzer Script
 * Week 2 - Technical Excellence: Performance Optimization
 * 
 * Analyzes bundle size and provides optimization recommendations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLE_BUDGETS = {
  js: 450000, // 450KB
  css: 50000, // 50KB
  images: 200000, // 200KB
  total: 800000 // 800KB
};

const PERFORMANCE_THRESHOLDS = {
  warning: 0.8, // 80% of budget
  critical: 0.95 // 95% of budget
};

async function analyzeBundleSize() {
  console.log('🔍 Starting Bundle Size Analysis...\n');
  
  const distPath = path.join(__dirname, '../../client/dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Build directory not found. Please run "npm run build" first.');
    process.exit(1);
  }
  
  const bundleAnalysis = await getBundleMetrics(distPath);
  
  // Display results
  displayBundleReport(bundleAnalysis);
  
  // Check against budgets
  const budgetResults = checkBudgets(bundleAnalysis);
  
  // Provide recommendations
  provideOptimizationRecommendations(bundleAnalysis, budgetResults);
  
  // Exit with appropriate code
  const hasViolations = budgetResults.some(result => result.status === 'critical');
  process.exit(hasViolations ? 1 : 0);
}

async function getBundleMetrics(distPath) {
  const metrics = {
    js: { files: [], totalSize: 0 },
    css: { files: [], totalSize: 0 },
    images: { files: [], totalSize: 0 },
    other: { files: [], totalSize: 0 },
    totalSize: 0
  };
  
  function analyzeDirectory(dirPath, relativePath = '') {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const relativeFilePath = path.join(relativePath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        analyzeDirectory(filePath, relativeFilePath);
      } else {
        const fileSize = stats.size;
        metrics.totalSize += fileSize;
        
        const ext = path.extname(file).toLowerCase();
        const fileInfo = {
          name: relativeFilePath,
          size: fileSize,
          sizeFormatted: formatBytes(fileSize)
        };
        
        if (['.js', '.mjs'].includes(ext)) {
          metrics.js.files.push(fileInfo);
          metrics.js.totalSize += fileSize;
        } else if (ext === '.css') {
          metrics.css.files.push(fileInfo);
          metrics.css.totalSize += fileSize;
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'].includes(ext)) {
          metrics.images.files.push(fileInfo);
          metrics.images.totalSize += fileSize;
        } else {
          metrics.other.files.push(fileInfo);
          metrics.other.totalSize += fileSize;
        }
      }
    }
  }
  
  analyzeDirectory(distPath);
  
  // Sort files by size (largest first)
  Object.keys(metrics).forEach(key => {
    if (metrics[key].files) {
      metrics[key].files.sort((a, b) => b.size - a.size);
    }
  });
  
  return metrics;
}

function displayBundleReport(analysis) {
  console.log('📊 Bundle Size Report');
  console.log('=' .repeat(50));
  
  console.log(`\n📦 JavaScript Bundles (${analysis.js.files.length} files)`);
  console.log(`   Total Size: ${formatBytes(analysis.js.totalSize)}`);
  console.log(`   Budget: ${formatBytes(BUNDLE_BUDGETS.js)}`);
  console.log(`   Usage: ${((analysis.js.totalSize / BUNDLE_BUDGETS.js) * 100).toFixed(1)}%`);
  
  // Show largest JS files
  const topJSFiles = analysis.js.files.slice(0, 5);
  topJSFiles.forEach(file => {
    console.log(`   - ${file.name}: ${file.sizeFormatted}`);
  });
  
  console.log(`\n🎨 CSS Stylesheets (${analysis.css.files.length} files)`);
  console.log(`   Total Size: ${formatBytes(analysis.css.totalSize)}`);
  console.log(`   Budget: ${formatBytes(BUNDLE_BUDGETS.css)}`);
  console.log(`   Usage: ${((analysis.css.totalSize / BUNDLE_BUDGETS.css) * 100).toFixed(1)}%`);
  
  // Show largest CSS files
  const topCSSFiles = analysis.css.files.slice(0, 3);
  topCSSFiles.forEach(file => {
    console.log(`   - ${file.name}: ${file.sizeFormatted}`);
  });
  
  console.log(`\n🖼️  Images (${analysis.images.files.length} files)`);
  console.log(`   Total Size: ${formatBytes(analysis.images.totalSize)}`);
  console.log(`   Budget: ${formatBytes(BUNDLE_BUDGETS.images)}`);
  console.log(`   Usage: ${((analysis.images.totalSize / BUNDLE_BUDGETS.images) * 100).toFixed(1)}%`);
  
  // Show largest image files
  const topImageFiles = analysis.images.files.slice(0, 3);
  topImageFiles.forEach(file => {
    console.log(`   - ${file.name}: ${file.sizeFormatted}`);
  });
  
  console.log(`\n📁 Total Bundle Size`);
  console.log(`   Size: ${formatBytes(analysis.totalSize)}`);
  console.log(`   Budget: ${formatBytes(BUNDLE_BUDGETS.total)}`);
  console.log(`   Usage: ${((analysis.totalSize / BUNDLE_BUDGETS.total) * 100).toFixed(1)}%`);
}

function checkBudgets(analysis) {
  const results = [];
  
  const checks = [
    { type: 'JavaScript', size: analysis.js.totalSize, budget: BUNDLE_BUDGETS.js },
    { type: 'CSS', size: analysis.css.totalSize, budget: BUNDLE_BUDGETS.css },
    { type: 'Images', size: analysis.images.totalSize, budget: BUNDLE_BUDGETS.images },
    { type: 'Total', size: analysis.totalSize, budget: BUNDLE_BUDGETS.total }
  ];
  
  checks.forEach(check => {
    const usage = check.size / check.budget;
    let status = 'ok';
    let icon = '✅';
    
    if (usage >= PERFORMANCE_THRESHOLDS.critical) {
      status = 'critical';
      icon = '🚨';
    } else if (usage >= PERFORMANCE_THRESHOLDS.warning) {
      status = 'warning';
      icon = '⚠️';
    }
    
    results.push({
      type: check.type,
      size: check.size,
      budget: check.budget,
      usage: usage,
      status: status,
      icon: icon
    });
  });
  
  console.log('\n🎯 Budget Analysis');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    console.log(
      `${result.icon} ${result.type}: ${formatBytes(result.size)} / ${formatBytes(result.budget)} ` +
      `(${(result.usage * 100).toFixed(1)}%)`
    );
  });
  
  return results;
}

function provideOptimizationRecommendations(analysis, budgetResults) {
  console.log('\n💡 Optimization Recommendations');
  console.log('=' .repeat(50));
  
  const recommendations = [];
  
  // JavaScript optimizations
  if (analysis.js.totalSize > BUNDLE_BUDGETS.js * PERFORMANCE_THRESHOLDS.warning) {
    recommendations.push('🚀 JavaScript Bundle Optimizations:');
    recommendations.push('   • Implement code splitting for large components');
    recommendations.push('   • Use dynamic imports for analytics and AI components');
    recommendations.push('   • Enable tree shaking in Vite configuration');
    recommendations.push('   • Consider lazy loading non-critical features');
    
    const largestJS = analysis.js.files[0];
    if (largestJS && largestJS.size > 150000) {
      recommendations.push(`   • ${largestJS.name} is ${largestJS.sizeFormatted} - consider splitting`);
    }
  }
  
  // CSS optimizations
  if (analysis.css.totalSize > BUNDLE_BUDGETS.css * PERFORMANCE_THRESHOLDS.warning) {
    recommendations.push('\n🎨 CSS Optimizations:');
    recommendations.push('   • Remove unused CSS with PurgeCSS');
    recommendations.push('   • Use CSS-in-JS for component-specific styles');
    recommendations.push('   • Minimize Tailwind CSS bundle size');
    recommendations.push('   • Consider critical CSS extraction');
  }
  
  // Image optimizations
  if (analysis.images.totalSize > BUNDLE_BUDGETS.images * PERFORMANCE_THRESHOLDS.warning) {
    recommendations.push('\n🖼️  Image Optimizations:');
    recommendations.push('   • Use WebP/AVIF formats for better compression');
    recommendations.push('   • Implement responsive images with srcset');
    recommendations.push('   • Use CDN for image delivery');
    recommendations.push('   • Optimize image sizes for actual usage');
    
    const largestImage = analysis.images.files[0];
    if (largestImage && largestImage.size > 50000) {
      recommendations.push(`   • ${largestImage.name} is ${largestImage.sizeFormatted} - optimize`);
    }
  }
  
  // General optimizations
  recommendations.push('\n⚡ General Performance:');
  recommendations.push('   • Enable gzip/brotli compression on server');
  recommendations.push('   • Use service worker for caching');
  recommendations.push('   • Implement resource preloading for critical assets');
  recommendations.push('   • Consider HTTP/2 push for critical resources');
  
  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log('🎉 All bundle sizes are within budget limits!');
    console.log('   Continue monitoring performance as the app grows.');
  }
  
  // Performance CI integration
  console.log('\n🔧 CI/CD Integration:');
  console.log('   Add bundle size monitoring to GitHub Actions');
  console.log('   Set up Lighthouse CI for automated performance testing');
  console.log('   Configure bundle analyzer reports in PR comments');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Run the analyzer
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeBundleSize().catch(console.error);
} 