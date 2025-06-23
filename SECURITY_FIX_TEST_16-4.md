📊 PRE-FIX STATE (Mon Jun 23 16:57:05 IDT 2025)
========================================

# npm audit report

tar-fs  2.0.0 - 2.1.2
Severity: high
tar-fs Vulnerable to Link Following and Path Traversal via Extracting a Crafted tar File - https://github.com/advisories/GHSA-pq67-2wwv-3xjx
tar-fs can extract outside the specified dir with a specific tarball - https://github.com/advisories/GHSA-8cj5-5rvv-wf4v
fix available via `npm audit fix --force`
Will install @size-limit/preset-app@11.2.0, which is outside the stated dependency range
node_modules/estimo/node_modules/tar-fs
  puppeteer-core  10.0.0 - 22.11.1
  Depends on vulnerable versions of tar-fs
  Depends on vulnerable versions of ws
  node_modules/estimo/node_modules/puppeteer-core
    estimo  2.2.8 - 2.3.6
    Depends on vulnerable versions of puppeteer-core
    node_modules/estimo
      @size-limit/time  5.0.0 - 11.0.0
      Depends on vulnerable versions of estimo
      node_modules/@size-limit/time
        @size-limit/preset-app  5.0.0 - 11.0.0
        Depends on vulnerable versions of @size-limit/time
        client/node_modules/@size-limit/preset-app

ws  8.0.0 - 8.17.0
Severity: high
ws affected by a DoS when handling a request with many HTTP headers - https://github.com/advisories/GHSA-3h5v-q93c-6h6q
fix available via `npm audit fix --force`
Will install @size-limit/preset-app@11.2.0, which is outside the stated dependency range
node_modules/estimo/node_modules/ws

6 high severity vulnerabilities

To address all issues, run:
  npm audit fix --force

🔧 APPLYING AUTOMATED FIX (Mon Jun 23 16:57:21 IDT 2025)
========================================
