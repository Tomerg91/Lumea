# Performance Budgets

## Overview
This project implements automated performance budgets to ensure consistent performance across deployments. Performance budgets are automatically enforced in CI/CD pipelines and will fail pull requests that exceed defined thresholds.

## Performance Thresholds

### Bundle Size Limits (Gzipped)
- **App Components**: < 90 kB
- **Vendor React**: < 120 kB  
- **Vendor Charts**: < 50 kB
- **CSS Total**: < 25 kB

### Lighthouse Performance Metrics
- **Performance Score**: ≥ 85/100
- **Accessibility Score**: ≥ 90/100
- **Best Practices Score**: ≥ 85/100
- **SEO Score**: ≥ 85/100

### Core Web Vitals
- **First Contentful Paint (FCP)**: ≤ 2.0s
- **Largest Contentful Paint (LCP)**: ≤ 3.0s
- **Cumulative Layout Shift (CLS)**: ≤ 0.1
- **Total Blocking Time (TBT)**: ≤ 300ms
- **Speed Index**: ≤ 3.5s

### Resource Size Limits
- **JavaScript Total**: ≤ 450 kB
- **CSS Total**: ≤ 50 kB
- **Images Total**: ≤ 200 kB
- **Total Resources**: ≤ 800 kB

## Automation

### GitHub Actions Workflow
The performance budget is enforced via `.github/workflows/performance.yml`:

1. **Bundle Size Check**: Runs `bundlesize2` and `size-limit` tools
2. **Lighthouse CI**: Runs Lighthouse performance audits
3. **PR Comments**: Posts performance results directly to pull requests

### Triggering Conditions
Performance checks run on:
- Pull requests to `main` branch
- Pushes to `main` branch
- Changes to client code, build configs, or performance configs

## Tools Used

### Bundle Analysis
- **bundlesize2**: Enforces gzipped bundle size limits
- **size-limit**: Provides detailed bundle analysis
- **rollup-plugin-visualizer**: Generates bundle composition reports

### Performance Monitoring
- **@lhci/cli**: Lighthouse CI for automated performance testing
- **Lighthouse**: Google's performance auditing tool

## Local Development

### Running Performance Checks
```bash
# Check bundle sizes
cd client && npm run bundlesize

# Run size-limit analysis  
cd client && npm run size

# Run Lighthouse CI
npm run lighthouse

# Generate bundle analysis
cd client && npm run build:analyze
```

### Viewing Reports
- **Bundle Analysis**: Open `client/stats.html` after running `build:analyze`
- **Lighthouse Reports**: Check `lighthouse-reports/` directory
- **CI Results**: View GitHub Actions workflow results

## Thresholds Rationale

### Bundle Size Limits
Based on current optimized bundle analysis:
- **App Components**: 85 kB gzipped (current) → 90 kB limit (6% buffer)
- **Vendor React**: 117 kB gzipped (current) → 120 kB limit (3% buffer)
- **Vendor Charts**: 48 kB gzipped (current) → 50 kB limit (4% buffer)
- **CSS**: Currently ~21 kB → 25 kB limit (19% buffer for growth)

### Performance Scores
- **Performance 85+**: Ensures good user experience
- **Accessibility 90+**: High accessibility standards
- **Best Practices 85+**: Code quality and security
- **SEO 85+**: Search engine optimization

### Core Web Vitals
Based on Google's recommended thresholds for good user experience:
- **FCP ≤ 2.0s**: Users see content quickly
- **LCP ≤ 3.0s**: Main content loads fast
- **CLS ≤ 0.1**: Minimal layout shifts
- **TBT ≤ 300ms**: Page remains responsive

## Monitoring & Maintenance

### Regular Reviews
- **Monthly**: Review performance trends and adjust thresholds
- **After Major Features**: Reassess budgets based on new functionality
- **Performance Regressions**: Investigate and fix issues promptly

### Threshold Updates
To update performance budgets:
1. Modify `client/package.json` bundlesize/size-limit configs
2. Update `lighthouserc.json` Lighthouse thresholds
3. Update this documentation
4. Test changes in CI environment

### Performance Optimization
When budgets are exceeded:
1. **Analyze**: Use bundle analyzer to identify large dependencies
2. **Optimize**: Apply code splitting, lazy loading, tree shaking
3. **Measure**: Verify improvements with local tools
4. **Validate**: Ensure CI passes before merging

## Emergency Procedures

### Temporary Threshold Bypass
If urgent deployment is needed with performance regression:
1. Create emergency branch with relaxed thresholds
2. Deploy with monitoring
3. Create immediate follow-up task to fix performance
4. Restore original thresholds after fix

### Performance Incident Response
1. **Identify**: Monitor Core Web Vitals in production
2. **Investigate**: Use Lighthouse and bundle analysis
3. **Fix**: Apply appropriate optimization techniques
4. **Verify**: Ensure fix resolves issue without new regressions
5. **Document**: Update performance playbook with lessons learned

---
*Last Updated: 2024-06-17*
*Part of Epic 8: Technical Excellence & Debt Reduction* 