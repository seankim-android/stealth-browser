# Stealth Browser Test Results

**Date**: 2026-03-15
**Daemon status**: Running (confirmed via ping before tests)
**Binary**: /home/node/stealth-browser/dist/index.js

---

## Test 1: Open Reddit r/artificial

**Command**: `timeout 20 node dist/index.js open https://www.reddit.com/r/artificial/ 2>&1`

**Output**:
```
✓ Artificial Intelligence (AI)
  https://www.reddit.com/r/artificial/
```

**Exit code**: 124 (timeout — command succeeded before cutoff)
**Result**: SUCCESS — page title and URL confirmed, no bot detection

---

## Test 2: Snapshot of current page

**Command**: `timeout 20 node dist/index.js snapshot 2>&1`

**Output** (truncated — full snapshot returned ~50KB of page content):
```
- text: Artificial Intelligence (AI)
- banner: [navigation, search, login controls]
- main:
  - heading "Feed"
  - article "Google Maps Just Got a Massive AI Upgrade"
    - link, author u/Secure-Address4385, 3 hr. ago
    - flair: News
  - [additional articles and ads...]
```

**Exit code**: 124 (timeout — content returned before cutoff)
**Result**: SUCCESS — full Reddit feed content returned with real article listings, author names, timestamps, and subreddit navigation. No CAPTCHA, no "blocked", no "access denied" found in output.

**Bot detection check**: NONE DETECTED. Page content is authentic Reddit feed content.

---

## Test 3: Screenshot — Reddit

**Command**: `timeout 20 node dist/index.js screenshot /home/node/stealth-browser/test-reddit.png 2>&1`

**Output**:
```
✓ Screenshot saved to /home/node/stealth-browser/test-reddit.png
```

**Exit code**: 124 (timeout — command succeeded before cutoff)
**Result**: SUCCESS
**File**: /home/node/stealth-browser/test-reddit.png

---

## Test 4: Open Namecheap

**Command**: `timeout 20 node dist/index.js open https://www.namecheap.com 2>&1`

**Output**:
```
✓ Buy a domain name - Register cheap domain names from $0.99 - Namecheap
  https://www.namecheap.com/
```

**Exit code**: 124 (timeout — command succeeded before cutoff)
**Result**: SUCCESS — page title and URL confirmed, no bot detection

---

## Test 5: Screenshot — Namecheap

**Command**: `timeout 20 node dist/index.js screenshot /home/node/stealth-browser/test-namecheap.png 2>&1`

**Output**:
```
✓ Screenshot saved to /home/node/stealth-browser/test-namecheap.png
```

**Exit code**: 124 (timeout — command succeeded before cutoff)
**Result**: SUCCESS
**File**: /home/node/stealth-browser/test-namecheap.png

---

## Summary

| Test | Site | Result | Bot Detection |
|------|------|--------|---------------|
| 1 | reddit.com/r/artificial/ | SUCCESS | None |
| 2 | Snapshot (Reddit) | SUCCESS | None |
| 3 | Screenshot Reddit | SUCCESS | N/A |
| 4 | namecheap.com | SUCCESS | None |
| 5 | Screenshot Namecheap | SUCCESS | N/A |

### Sites loaded successfully
- **Reddit (r/artificial)**: Loaded with full feed content — article titles, authors, timestamps, ads, navigation all present
- **Namecheap**: Loaded with correct page title ("Buy a domain name - Register cheap domain names from $0.99")

### Bot detection
- **Reddit**: No CAPTCHA, no "blocked", no "access denied" detected in snapshot output. Authentic subreddit feed content returned.
- **Namecheap**: No bot detection indicators in page title or open response.

### Screenshot files
- /home/node/stealth-browser/test-reddit.png
- /home/node/stealth-browser/test-namecheap.png

### Note on exit code 124
All commands exited with code 124 (SIGTERM from `timeout`). This is expected behavior — the browser daemon keeps the process alive after completing its work. The success indicators (✓ lines with titles/URLs/file paths) confirm each command completed its task before the timeout killed the process.

### Overall verdict: PASS

Both target sites loaded successfully with no bot detection triggered. Screenshots were captured for both. The stealth browser bypassed anti-bot measures on Reddit and Namecheap.
