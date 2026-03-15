# stealth-browser — Build Plan

## What It Is
A command-line browser automation tool for AI agents with anti-bot-detection built in. Drop-in replacement for agent-browser on sites that block headless browsers.

## Why We're Building It
- agent-browser gets blocked by Reddit, Namecheap, Yelp, and most major sites
- No good OSS alternative exists that's purpose-built for AI agents
- We need it ourselves; others do too
- Publishable to GitHub + npm as an open source project

---

## Architecture

```
stealth-browser/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── browser.ts        # BrowserManager: launch, close, stealth setup
│   ├── commands.ts       # Command handlers: open, screenshot, snapshot, etc.
│   ├── snapshot.ts       # Accessibility tree → text snapshot
│   └── types.ts          # Shared types
├── package.json
├── tsconfig.json
├── README.md
└── BUILD_LOG.md
```

## Dependencies
- `playwright` — browser automation core
- `playwright-extra` — plugin system wrapper around playwright
- `puppeteer-extra-plugin-stealth` — anti-detection: spoofs WebGL, canvas, user agent, chrome runtime, etc.
- `typescript`, `tsx` — TypeScript execution
- `@types/node` — Node.js types

## CLI Commands (v1)

| Command | Description |
|---------|-------------|
| `stealth-browser open <url>` | Navigate to URL |
| `stealth-browser screenshot [path]` | Save screenshot |
| `stealth-browser snapshot` | Print accessibility tree snapshot |
| `stealth-browser snapshot -i` | Interactive elements only |
| `stealth-browser click @e1` | Click element by ref |
| `stealth-browser fill @e1 "text"` | Fill input |
| `stealth-browser type @e1 "text"` | Type without clearing |
| `stealth-browser scroll down 500` | Scroll page |
| `stealth-browser get text @e1` | Get element text |
| `stealth-browser get title` | Get page title |
| `stealth-browser get url` | Get current URL |
| `stealth-browser close` | Close browser |

## Output Format
Match agent-browser output format exactly so it's a drop-in swap.

## Stealth Techniques Applied
1. `puppeteer-extra-plugin-stealth` — handles ~20 detection vectors automatically:
   - navigator.webdriver = false
   - Chrome runtime object present
   - WebGL vendor/renderer spoofed
   - Canvas fingerprint randomized
   - User agent set to real Chrome version
   - Plugin/mimeType arrays populated
   - Permission API spoofed
2. Realistic viewport (1280x800)
3. Real Chrome user agent string
4. Proxy support via `STEALTH_PROXY` env var (http://user:pass@host:port)
5. Request header normalization

## State Management
- Browser state persisted in `~/.stealth-browser/session.json`
- Single persistent browser instance across CLI calls (like agent-browser)
- Unix socket for IPC between CLI calls and daemon process

## Build Steps
1. [ ] Project setup (package.json, tsconfig)
2. [ ] Install dependencies
3. [ ] Implement browser.ts (launch with stealth, persistent context)
4. [ ] Implement snapshot.ts (accessibility tree)
5. [ ] Implement commands.ts (all CLI commands)
6. [ ] Implement index.ts (CLI entry point + IPC)
7. [ ] Test: open reddit.com — should not get blocked
8. [ ] Test: open namecheap.com domain search
9. [ ] Test: screenshot, snapshot, click, fill
10. [ ] Write README
11. [ ] Publish to GitHub

## Success Criteria
- `stealth-browser open https://www.reddit.com/r/artificial/` returns page content without captcha
- `stealth-browser open https://www.namecheap.com/domains/registration/results/?domain=builtbyagent.com` returns domain availability
- All basic commands work reliably

---

## Timeline Estimate
- Setup + deps: 15 min
- Core browser + stealth: 30 min
- All commands: 45 min
- Testing + fixes: 30 min
- README: 15 min
- Total: ~2.5 hours
