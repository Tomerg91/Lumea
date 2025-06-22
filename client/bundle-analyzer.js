#!/usr/bin/env node

/**
 * Bundle Size Analyzer for SatyaCoaching Platform
 * Week 2 - Technical Excellence: Performance Optimization
 * 
 * Analyzes build output and provides optimization recommendations
 * Usage: node bundle-analyzer.js [--ci] [--budget-file=path]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance budgets (from package.json size-limit config)
const PERFORMANCE_BUDGETS = {
  'app': { limit: 450 * 1024, name: 'App Bundle' }, // 450KB
  'vendor-react': { limit: 130 * 1024, name: 'Vendor React' }, // 130KB  
  'vendor-charts': { limit: 55 * 1024, name: 'Vendor Charts' }, // 55KB
  'css': { limit: 50 * 1024, name: 'Total CSS' }, // 50KB
  'total': { limit: 800 * 1024, name: 'Total Bundle' } // 800KB
};

// Command line arguments
const args = process.argv.slice(2);
const isCI = args.includes('--ci');
const verbose = args.includes('--verbose');

class BundleAnalyzer {
  constructor() {
    this.distPath = path.join(__dirname, 'dist');
    this.results = {
      bundles: {},
      violations: [],
      recommendations: [],
      summary: {}
    };
  }

  async analyze() {
    console.log('🔍 Analyzing bundle sizes...\n');

    if (!fs.existsSync(this.distPath)) {
      console.error('❌ Build directory not found. Run `npm run build` first.');
      process.exit(1);
    }

    // Analyze JavaScript bundles
    this.analyzeJavaScript();
    
    // Analyze CSS bundles
    this.analyzeCSS();
    
    // Analyze assets
    this.analyzeAssets();
    
    // Calculate totals
    this.calculateTotals();
    
    // Check against budgets
    this.checkBudgets();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Output results
    this.outputResults();
    
    // Exit with appropriate code for CI
    if (isCI && this.results.violations.length > 0) {
      process.exit(1);
    }
  }

  analyzeJavaScript() {
    const assetsPath = path.join(this.distPath, 'assets');
    if (!fs.existsSync(assetsPath)) return;

    const files = fs.readdirSync(assetsPath);
    
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const filePath = path.join(assetsPath, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        
        // Categorize bundles
        let category = 'app';
        if (file.includes('vendor-react')) category = 'vendor-react';
        else if (file.includes('vendor-charts')) category = 'vendor-charts';
        else if (file.includes('vendor')) category = 'vendor';
        
        if (!this.results.bundles[category]) {
          this.results.bundles[category] = { files: [], totalSize: 0 };
        }
        
        this.results.bundles[category].files.push({
          name: file,
          size: size,
          sizeFormatted: this.formatBytes(size)
        });
        
        this.results.bundles[category].totalSize += size;
      }
    });
  }

  analyzeCSS() {
    const assetsPath = path.join(this.distPath, 'assets');
    if (!fs.existsSync(assetsPath)) return;

    const files = fs.readdirSync(assetsPath);
    let totalCSSSize = 0;
    const cssFiles = [];
    
    files.forEach(file => {
      if (file.endsWith('.css')) {
        const filePath = path.join(assetsPath, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        
        cssFiles.push({
          name: file,
          size: size,
          sizeFormatted: this.formatBytes(size)
        });
        
        totalCSSSize += size;
      }
    });

    this.results.bundles.css = {
      files: cssFiles,
      totalSize: totalCSSSize
    };
  }

  analyzeAssets() {
    const assetsPath = path.join(this.distPath, 'assets');
    if (!fs.existsSync(assetsPath)) return;

    const files = fs.readdirSync(assetsPath);
    let totalAssetSize = 0;
    const assetFiles = [];
    
    files.forEach(file => {
      if (file.match(/\.(png|jpg|jpeg|gif|webp|svg|woff|woff2|ico)$/)) {
        const filePath = path.join(assetsPath, file);
        const stats = fs.statSync(filePath);
        const size = stats.size;
        
        assetFiles.push({
          name: file,
          size: size,
          sizeFormatted: this.formatBytes(size)
        });
        
        totalAssetSize += size;
      }
    });

    this.results.bundles.assets = {
      files: assetFiles,
      totalSize: totalAssetSize
    };
  }

  calculateTotals() {
    let totalSize = 0;
    Object.values(this.results.bundles).forEach(bundle => {
      totalSize += bundle.totalSize;
    });
    
    this.results.summary = {
      totalSize: totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      bundleCount: Object.keys(this.results.bundles).length,
      fileCount: Object.values(this.results.bundles).reduce((acc, bundle) => acc + bundle.files.length, 0)
    };
  }

  checkBudgets() {
    // Check individual bundle budgets
    Object.entries(PERFORMANCE_BUDGETS).forEach(([bundleType, budget]) => {
      if (bundleType === 'total') return; // Handle separately
      
      const bundle = this.results.bundles[bundleType];
      if (bundle && bundle.totalSize > budget.limit) {
        this.results.violations.push({
          type: 'budget',
          bundle: bundleType,
          name: budget.name,
          actual: bundle.totalSize,
          limit: budget.limit,
          overage: bundle.totalSize - budget.limit,
          overageFormatted: this.formatBytes(bundle.totalSize - budget.limit)
        });
      }
    });

    // Check total budget
    if (this.results.summary.totalSize > PERFORMANCE_BUDGETS.total.limit) {
      this.results.violations.push({
        type: 'budget',
        bundle: 'total',
        name: 'Total Bundle',
        actual: this.results.summary.totalSize,
        limit: PERFORMANCE_BUDGETS.total.limit,
        overage: this.results.summary.totalSize - PERFORMANCE_BUDGETS.total.limit,
        overageFormatted: this.formatBytes(this.results.summary.totalSize - PERFORMANCE_BUDGETS.total.limit)
      });
    }
  }

  generateRecommendations() {
    // Large file recommendations
    Object.entries(this.results.bundles).forEach(([bundleType, bundle]) => {
      bundle.files.forEach(file => {
        if (file.size > 100 * 1024) { // > 100KB
          this.results.recommendations.push({
            type: 'large-file',
            message: `Large file detected: ${file.name} (${file.sizeFormatted})`,
            suggestion: 'Consider code splitting or lazy loading'
          });
        }
      });
    });

    // Bundle-specific recommendations
    if (this.results.bundles.app && this.results.bundles.app.totalSize > 300 * 1024) {
      this.results.recommendations.push({
        type: 'app-size',
        message: `App bundle is large (${this.formatBytes(this.results.bundles.app.totalSize)})`,
        suggestion: 'Consider dynamic imports for route-based code splitting'
      });
    }

    if (this.results.bundles.css && this.results.bundles.css.totalSize > 30 * 1024) {
      this.results.recommendations.push({
        type: 'css-size',
        message: `CSS bundle is large (${this.formatBytes(this.results.bundles.css.totalSize)})`,
        suggestion: 'Consider CSS purging or splitting critical CSS'
      });
    }

    // Asset recommendations
    if (this.results.bundles.assets) {
      this.results.bundles.assets.files.forEach(file => {
        if (file.name.match(/\.(png|jpg|jpeg)$/) && file.size > 50 * 1024) {
          this.results.recommendations.push({
            type: 'image-optimization',
            message: `Large image: ${file.name} (${file.sizeFormatted})`,
            suggestion: 'Convert to WebP format and optimize compression'
          });
        }
      });
    }
  }

  outputResults() {
    console.log('📊 Bundle Analysis Results\n');
    console.log('='.repeat(50));

    // Summary
    console.log('\n📋 Summary:');
    console.log(`Total Size: ${this.results.summary.totalSizeFormatted}`);
    console.log(`Bundle Count: ${this.results.summary.bundleCount}`);
    console.log(`File Count: ${this.results.summary.fileCount}`);

    // Budget violations
    if (this.results.violations.length > 0) {
      console.log('\n❌ Budget Violations:');
      this.results.violations.forEach(violation => {
        console.log(`  • ${violation.name}: ${this.formatBytes(violation.actual)} (over by ${violation.overageFormatted})`);
      });
    } else {
      console.log('\n✅ All performance budgets met!');
    }

    // Bundle breakdown
    if (verbose || this.results.violations.length > 0) {
      console.log('\n📦 Bundle Breakdown:');
      Object.entries(this.results.bundles).forEach(([bundleType, bundle]) => {
        console.log(`\n  ${bundleType.toUpperCase()}: ${this.formatBytes(bundle.totalSize)}`);
        if (verbose) {
          bundle.files.forEach(file => {
            console.log(`    - ${file.name}: ${file.sizeFormatted}`);
          });
        }
      });
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:');
      this.results.recommendations.forEach(rec => {
        console.log(`  • ${rec.message}`);
        console.log(`    → ${rec.suggestion}`);
      });
    }

    // Next steps
    console.log('\n🚀 Next Steps:');
    if (this.results.violations.length > 0) {
      console.log('  • Address budget violations to improve performance');
      console.log('  • Implement code splitting for large bundles');
      console.log('  • Consider lazy loading for heavy components');
    } else {
      console.log('  • Consider implementing preloading for critical resources');
      console.log('  • Monitor bundle growth with automated checks');
      console.log('  • Explore tree shaking optimizations');
    }

    console.log('\n='.repeat(50));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run analysis directly (ES module compatibility)
const analyzer = new BundleAnalyzer();
analyzer.analyze().catch(error => {
  console.error('❌ Bundle analysis failed:', error.message);
  process.exit(1);
});

export default BundleAnalyzer; 