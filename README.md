# stealth-browser

A command-line browser for AI agents that bypasses bot detection. Uses Playwright with anti-detection plugins to access sites that block standard headless automation.

## Install

```bash
npm install -g stealth-browser
playwright install chromium
```

Or in your project:

```bash
npm install stealth-browser
npx playwright install chromium
```

## Quick Start

Open a site:

```bash
stealth-browser open https://www.reddit.com/r/artificial/
```

Take a screenshot:

```bash
stealth-browser screenshot /tmp/page.png
```

Get an accessibility snapshot with interactive element refs:

```bash
stealth-browser snapshot
```

This outputs a tree with labels like `[ref=e1]`, `[ref=e2]` on clickable elements. Click by ref:

```bash
stealth-browser click e1
stealth-browser fill e3 "search text"
stealth-browser press Enter
```

Close the browser:

```bash
stealth-browser close
```

## Commands

| Command | Description |
|---------|-------------|
| `open <url>` | Navigate to URL |
| `screenshot [path] [--full]` | Save screenshot (full page with `--full`) |
| `snapshot [-i] [-c]` | Print accessibility tree (`-i` for interactive only, `-c` for compact) |
| `click @ref` | Click element by ref |
| `fill @ref "text"` | Clear and fill input |
| `type @ref "text"` | Type without clearing |
| `press <key>` | Press keyboard key (e.g., `Enter`, `Escape`) |
| `scroll [up\|down\|left\|right] [px]` | Scroll page (default 500px down) |
| `hover @ref` | Hover over element |
| `get title` | Get page title |
| `get url` | Get current URL |
| `get text @ref` | Get element text |
| `get value @ref` | Get input value |
| `get html @ref` | Get element HTML |
| `get attr @ref <attr>` | Get element attribute |
| `wait [ms]` | Wait N milliseconds |
| `wait --text="..."` | Wait for text on page |
| `wait @ref` | Wait for element to appear |
| `close` | Close browser and daemon |
| `ping` | Check daemon status |

## How It Works

stealth-browser runs a persistent daemon process that holds the browser open between commands. Each CLI call connects via Unix socket, sends a command, and gets back a response. This eliminates startup overhead and keeps page state alive across invocations.

```
stealth-browser cmd1  →  [daemon launches browser]
stealth-browser cmd2  →  [daemon reuses browser]
stealth-browser cmd3  →  [daemon reuses browser]
stealth-browser close →  [daemon closes browser]
```

Session state (cookies, localStorage) persists in `~/.stealth-browser/`.

## Why Stealth

Standard headless browsers are detectable because they expose APIs that don't exist in real Chrome. stealth-browser uses `puppeteer-extra-plugin-stealth` to patch these vectors:

- Hides navigator.webdriver flag
- Spoofs WebGL and canvas fingerprints
- Injects Chrome runtime objects
- Normalizes user agent and headers
- Populates plugin/mimeType arrays
- Spoof permission API responses

This isn't foolproof against sophisticated detection, but it handles the common checks that block most automated access.

## Environment Variables

```bash
STEALTH_PROXY=http://user:pass@proxy:port  # Route traffic through proxy
```

## Testing

Successfully tested on:
- Reddit domain pages (no captcha blocks)
- Namecheap domain availability search

## License

MIT
