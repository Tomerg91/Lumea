# CI Security Documentation

This document outlines the security scanning and CI processes implemented in the SatyaCoaching platform.

## Overview

We have implemented a comprehensive security scanning strategy that includes:

1. **Automated vulnerability scanning** in CI/CD pipelines
2. **Code quality and security analysis** with CodeQL
3. **Dependency security monitoring** with npm audit
4. **Optional advanced scanning** with Snyk
5. **License compliance checking**
6. **Secret detection** (basic patterns)

## Security Workflows

### 1. Main CI Pipeline (`ci.yml`)

**Triggers**: Push to main, Pull requests to main

**Security Components**:
- **Security Audit Job**: Runs npm audit on production dependencies
- **Audit Levels**: Moderate severity threshold for CI blocking
- **Coverage**: Root, Server, and Client packages

**Commands**:
```bash
# Server security audit
cd server && npm audit --audit-level=moderate --production

# Client security audit  
cd client && npm audit --audit-level=moderate --production

# Root security audit
npm audit --audit-level=moderate --production
```

### 2. Dedicated Security Scanning (`security.yml`)

**Triggers**: 
- Push to main
- Pull requests to main  
- Daily at 2 AM UTC (scheduled)

**Components**:

#### CodeQL Analysis
- **Languages**: JavaScript, TypeScript
- **Queries**: Security-extended + Security-and-quality
- **Matrix Strategy**: Runs for both languages
- **Permissions**: Security-events write access

#### Dependency Review (PR only)
- **Action**: `actions/dependency-review-action@v4`
- **Threshold**: Moderate severity
- **Features**: Automatic PR comments with security summary

#### Advanced Security Scanning
- **Comprehensive npm audit**: Low severity threshold with JSON output
- **Secret pattern detection**: Basic regex patterns for:
  - API keys
  - JWT secrets
  - Database URLs
- **Audit artifacts**: 30-day retention of scan results

#### License Compliance
- **Tool**: `license-checker`
- **Scope**: Production dependencies only
- **Restrictions**: Blocks GPL-3.0 and AGPL-3.0 licenses
- **Coverage**: All workspaces (root, server, client)

### 3. Optional Snyk Integration (`snyk-security.yml`)

**Triggers**:
- Push to main
- Pull requests to main
- Weekly on Sundays at 3 AM UTC

**Requirements**: 
- `SNYK_TOKEN` secret must be configured
- All jobs conditionally run only when token is available

**Components**:

#### Open Source Security
- **Threshold**: High severity for blocking, medium for reporting
- **Scope**: All projects (`--all-projects`)
- **Integration**: Results uploaded to GitHub Security tab

#### Container Security
- **Auto-detection**: Only runs if Dockerfiles are present
- **Threshold**: High severity
- **Scope**: All container images

#### Infrastructure as Code (IaC)
- **Threshold**: Medium severity
- **Coverage**: Terraform, CloudFormation, Kubernetes manifests

#### Dependency Monitoring
- **Trigger**: Main branch only
- **Purpose**: Track dependencies in Snyk dashboard
- **Frequency**: Every push to main

## Security Gates and Branch Protection

### Current Gates
- ✅ **Lint checks** must pass
- ✅ **Type checking** must pass  
- ✅ **Security audit** (moderate+) must pass
- ✅ **Build** must succeed
- ✅ **Tests** must pass

### Recommended Branch Protection Rules

Configure these in GitHub repository settings → Branches → Branch protection rules:

```yaml
Protection Rules for 'main':
- Require pull request reviews before merging
- Require status checks to pass before merging:
  - lint
  - build  
  - security-audit
  - test
  - CodeQL Analysis (javascript)
  - CodeQL Analysis (typescript)
- Require branches to be up to date before merging
- Require conversation resolution before merging
- Include administrators in restrictions
```

## Security Monitoring & Alerts

### GitHub Security Features

1. **Security Advisories**: 
   - Navigate to Security → Advisories
   - Monitor Dependabot alerts
   - Review and dismiss false positives

2. **Code Scanning Results**:
   - Navigate to Security → Code scanning  
   - Review CodeQL findings
   - Track security improvements over time

3. **Dependency Graph**:
   - Navigate to Insights → Dependency graph
   - Monitor vulnerable dependencies
   - Review dependency updates

### Manual Security Commands

```bash
# Comprehensive security audit
npm audit --audit-level=low

# Check for outdated packages
npm outdated

# Update dependencies (careful review required)
npm update

# Fix known vulnerabilities automatically  
npm audit fix

# Check licenses in production
npx license-checker --production --summary
```

## Vulnerability Response Process

### 1. Immediate Response (High/Critical)
1. **Assess Impact**: Determine if vulnerability affects production
2. **Create Issue**: Document vulnerability with CVSS score
3. **Implement Fix**: Update vulnerable package or apply workaround
4. **Test Fix**: Ensure functionality is preserved
5. **Deploy**: Rush to production if critical

### 2. Standard Response (Medium)
1. **Prioritize**: Add to security sprint backlog
2. **Schedule Fix**: Within 2 weeks
3. **Test Thoroughly**: Full regression testing
4. **Deploy**: Normal release cycle

### 3. Low Priority Response (Low/Info)
1. **Document**: Log in security tracking spreadsheet
2. **Batch Fix**: Include in next major dependency update
3. **Review**: Monthly security review meeting

## Development Workflow Integration

### Local Development

**Pre-commit checks** (recommended):
```bash
# Add to .husky/pre-commit or similar
npm audit --audit-level=high
npm run lint
npm run typecheck
```

**Weekly security review**:
```bash
# Run comprehensive security check
npm audit --audit-level=low
npx license-checker --production --summary
git log --since="1 week ago" --grep="security"
```

### Pull Request Guidelines

**Security considerations**:
- [ ] No hardcoded secrets or credentials
- [ ] Dependencies reviewed for known vulnerabilities  
- [ ] New dependencies have compatible licenses
- [ ] Security tests pass
- [ ] Code scanning shows no new issues

## Optional Snyk Setup

To enable advanced Snyk scanning:

1. **Create Snyk Account**: [snyk.io](https://snyk.io)
2. **Generate API Token**: User settings → API token
3. **Add GitHub Secret**: Repository settings → Secrets → `SNYK_TOKEN`
4. **Verify Integration**: Check Actions tab for Snyk workflows

**Snyk Benefits**:
- Real-time vulnerability database
- Fix suggestions and automated PRs
- Container and IaC scanning
- Integration with IDEs and local development

## Troubleshooting

### Common Issues

**1. npm audit failures in CI**
```bash
# Check specific package
npm audit --audit-level=moderate --production

# Review audit report
npm audit --json | jq '.vulnerabilities'

# Fix automatically (review changes!)
npm audit fix --production-only
```

**2. CodeQL analysis timeouts**
- Increase timeout in workflow
- Exclude large generated files
- Optimize TypeScript/JavaScript build

**3. False positive dependency alerts**
- Review vulnerability in context
- Check if dev-only dependency
- Dismiss in GitHub if not applicable

**4. License compliance failures**
- Review flagged licenses
- Replace problematic dependencies
- Get legal approval for exceptions

### Performance Optimization

**Reduce CI time**:
- Cache node_modules effectively
- Use `npm ci` instead of `npm install`
- Parallel job execution where possible
- Skip redundant scans on documentation-only changes

**Reduce false positives**:
- Configure appropriate severity thresholds
- Maintain ignore lists for known false positives
- Regular review and cleanup of suppressed issues

## Compliance and Reporting

### Security Metrics

Track these metrics monthly:
- Number of vulnerabilities found vs. fixed
- Time to remediation by severity
- Percentage of builds passing security gates
- Trend of dependency freshness

### Audit Preparation

**For security audits**:
1. Generate security scan summary
2. Document vulnerability response process
3. Show evidence of regular security updates
4. Demonstrate staff security training

**Key Artifacts**:
- This documentation
- GitHub Security tab reports
- Dependency update history
- Incident response records

## Updates and Maintenance

**This document should be updated when**:
- New security tools are integrated
- Workflow configurations change
- Vulnerability response process evolves
- Compliance requirements change

**Review Schedule**: Quarterly review of security processes and tooling

---

*Last Updated: January 2025*
*Next Review: April 2025* 