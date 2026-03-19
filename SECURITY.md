# Security Notes

`minsheng-observer` is a static GitHub Pages site. It does not expose a custom server, database, or executable backend on the public site, so the main hardening surface is the browser layer and the GitHub Actions pipeline.

## Current protections

- Core chart dependency is vendored locally in [`vendor/chart.umd.min.js`](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/vendor/chart.umd.min.js) to reduce CDN supply-chain risk.
- External webfonts have been removed from the public site to reduce third-party tracking and availability risk.
- All HTML pages ship with a browser-enforced Content Security Policy, referrer policy, and permissions policy.
- Dynamic external links are normalized in the browser and invalid protocols are downgraded to `#`.
- Links opened in a new tab are forced to use `rel="noopener noreferrer"`.
- Live vote endpoints are only used when they resolve to `https:` URLs, or to localhost during local development.
- Giscus is loaded from a fixed origin and the injected script uses `referrerPolicy="no-referrer"`.
- Scheduled GitHub Actions jobs use narrow permissions, fetch shallow history, and run with timeouts plus concurrency guards.
- A disclosure file is published at [`.well-known/security.txt`](/Users/dingchenchen/Desktop/AI辅助数据分析/minsheng-observer/.well-known/security.txt), and Dependabot is configured for GitHub Actions plus the backend prototype.

## Operational limits

- GitHub Pages does not let this project set server-level headers such as `X-Frame-Options` or `X-Content-Type-Options`; the site relies on meta-policy hardening instead.
- Real cross-user voting, login, and comments still require a separate backend. If enabled later, that backend should enforce rate limiting, CSRF protection, request signing, audit logs, and secret rotation.

## Reporting

If you notice a security issue in the site or its workflows, report it privately to the repository owner before opening a public issue.
