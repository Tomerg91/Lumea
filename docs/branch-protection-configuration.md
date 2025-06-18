# GitHub Branch Protection Configuration Guide

## Overview

This document provides the exact configuration needed to enforce CI and security requirements for all pull requests to the `main` branch. These settings ensure that no code can be merged without passing all quality, security, and performance checks.

## Required Status Checks

The following GitHub Actions jobs must pass before any PR can be merged:

### Core CI Pipeline (`ci.yml`, `typecheck.yml`)
- ✅ **lint** - ESLint code quality checks
- ✅ **build** - TypeScript compilation and application build  
- ✅ **security-audit** - npm audit security scanning
- ✅ **test** - Unit and integration test execution
- ✅ **typecheck** - TypeScript type checking validation

### Security Scanning (`security.yml`)
- ✅ **codeql-analysis (javascript)** - GitHub CodeQL security analysis for JavaScript
- ✅ **codeql-analysis (typescript)** - GitHub CodeQL security analysis for TypeScript
- ✅ **dependency-review** - Dependency vulnerability review (PR only)
- ✅ **advanced-security-scan** - Comprehensive npm audit and secret scanning
- ✅ **license-scan** - License compliance verification

### Performance Monitoring (`performance.yml`)
- ✅ **bundle-size** - Bundle size budget enforcement
- ✅ **lighthouse** - Lighthouse CI performance auditing

### Additional Required Checks
- ✅ **snyk-security** - Snyk vulnerability scanning (from `snyk-security.yml`)

## GitHub Branch Protection Settings

### Configuration via GitHub Web Interface

Navigate to: **Settings** → **Branches** → **Add rule** (for `main` branch)

**Branch Protection Rule Configuration:**

```yaml
Branch name pattern: main

☑️ Restrict pushes that create files larger than 100 MB
☑️ Require a pull request before merging
  ☑️ Require approvals: 1
  ☑️ Dismiss stale reviews when new commits are pushed
  ☑️ Require review from code owners
  ☑️ Restrict pushes that create files larger than 100 MB

☑️ Require status checks to pass before merging
  ☑️ Require branches to be up to date before merging
  
  Required status checks:
  - lint
  - build  
  - security-audit
  - test
  - typecheck
  - codeql-analysis (javascript)
  - codeql-analysis (typescript)
  - dependency-review
  - advanced-security-scan
  - license-scan
  - bundle-size
  - lighthouse
  - snyk-security

☑️ Require conversation resolution before merging
☑️ Require signed commits
☑️ Include administrators
☑️ Restrict pushes that create files larger than 100 MB
☑️ Allow force pushes: Never
☑️ Allow deletions: Never
```

### Configuration via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# macOS: brew install gh
# Login: gh auth login

# Create branch protection rule
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["lint","build","security-audit","test","typecheck","codeql-analysis (javascript)","codeql-analysis (typescript)","dependency-review","advanced-security-scan","license-scan","bundle-size","lighthouse","snyk-security"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null \
  --field required_conversation_resolution=true
```

### Configuration via Repository Settings API

```bash
curl -X PUT \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/OWNER/REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": [
        "lint",
        "build", 
        "security-audit",
        "test",
        "typecheck",
        "codeql-analysis (javascript)",
        "codeql-analysis (typescript)", 
        "dependency-review",
        "advanced-security-scan",
        "license-scan",
        "bundle-size",
        "lighthouse",
        "snyk-security"
      ]
    },
    "enforce_admins": true,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1,
      "dismiss_stale_reviews": true,
      "require_code_owner_reviews": true
    },
    "restrictions": null,
    "required_conversation_resolution": true
  }'
```

## Quality Gates Enforced

### 🔍 **Code Quality**
- ESLint passes with no errors
- TypeScript compiles without errors
- All unit and integration tests pass

### 🛡️ **Security**
- No high or critical security vulnerabilities in dependencies
- CodeQL security analysis passes
- No hardcoded secrets detected
- License compliance verified

### ⚡ **Performance**
- Bundle sizes within defined budgets:
  - App Components: < 90 kB gzipped
  - Vendor React: < 120 kB gzipped  
  - Vendor Charts: < 50 kB gzipped
  - CSS Total: < 25 kB gzipped
- Lighthouse performance scores meet thresholds

### 📋 **Process Requirements**
- All conversations resolved
- At least 1 approval from code owners
- Branch up to date with main
- Signed commits (if enabled)

## Emergency Procedures

### Temporary Branch Protection Bypass
In case of critical production issues requiring immediate deployment:

1. **Contact Repository Admin** to temporarily disable branch protection
2. **Create Emergency Issue** documenting the bypass reason
3. **Implement Fix** with minimal changes
4. **Re-enable Protection** immediately after fix
5. **Follow-up PR** to address any skipped checks

### CI Failure Recovery
If required checks are failing due to infrastructure issues:

1. **Verify Issue** is with CI infrastructure, not code
2. **Document Issue** in GitHub issue or incident tracking
3. **Contact DevOps/Admin** for assistance
4. **Consider Alternative** deployment approach if critical

## Monitoring and Alerts

### GitHub Status Check Notifications
- PRs blocked by failing checks will show clear status
- GitHub automatically notifies PR authors of check failures
- Check logs provide detailed failure information

### Slack/Email Integration
Consider configuring GitHub Apps for additional notifications:
- Failed check notifications to team channels
- Security vulnerability alerts
- Performance regression alerts

## Maintenance

### Regular Review
- **Monthly**: Review required checks list for additions/removals
- **Quarterly**: Verify all checks are still relevant and functioning
- **After Major Changes**: Update protection rules when adding/removing workflows

### Updates Required When:
- Adding new GitHub Actions workflows that should be required
- Removing or renaming existing workflow jobs
- Changing security or performance requirements
- Updating repository structure or build processes

---

## Implementation Status

- [ ] Configure branch protection via GitHub web interface
- [ ] Verify all required status checks are recognized
- [ ] Test with a sample PR to ensure all checks are enforced
- [ ] Document emergency procedures for team
- [ ] Set up monitoring and alerts
- [ ] Train team on new requirements

---

*Last Updated: January 2025*  
*Epic 9.7: Enforce PR gates for CI & security* 