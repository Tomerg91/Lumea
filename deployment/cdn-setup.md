# CDN Setup for SatyaCoaching Platform

## Cloudflare Setup (Recommended)

### 1. Domain Configuration
```
satyacoaching.com -> Main site
app.satyacoaching.com -> Client application  
api.satyacoaching.com -> API server
cdn.satyacoaching.com -> Static assets
```

### 2. Caching Rules
```
Static Assets (*.js, *.css, *.woff2): 1 year
Images (*.png, *.jpg, *.svg): 1 month
API Routes (/api/*): No cache
HTML files: 1 hour
```

### 3. Security Settings
```
SSL/TLS: Full (strict)
Always Use HTTPS: Enabled
HSTS: Enabled
WAF: Enabled
DDoS Protection: Enabled
```

## Environment Variables

Add to production environment:
```bash
CDN_URL=https://cdn.satyacoaching.com
STATIC_URL=https://cdn.satyacoaching.com/static
```

## Performance Benefits
- 40-60% faster global load times
- Reduced server bandwidth by 70%
- Improved SEO scores
- Better user experience worldwide 