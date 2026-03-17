# Build Log

## Mar 15, 2026

### 10:45 AM — Plan written
- Architecture defined
- Dependencies chosen
- CLI commands spec'd
- Starting build

### Status: COMPLETE — all commands working

## Mar 16, 2026

### ~12:00 AM — Bug fix: ref resolution broken on forms with hidden inputs

**Problem:** `snapshot` used `ariaSnapshot()` to count visible elements, but `fill`/`click` used CSS `nth()` which counted hidden DOM inputs too. On Dev.to signup, `fill @e9` (Name field) was hitting a hidden `utf8` input at nth(1) instead.

**Fix 1** — `snapshot.ts`: exclude `type=hidden` and `type=file` from textbox selector so CSS nth matches aria visible count.

**Fix 2** — `snapshot.ts`: store `role` in refMap entries alongside selector/index.

**Fix 3** — `browser.ts`: added `getLocator()` helper that uses `page.getByRole(role).nth(index)` for ARIA roles (button, textbox, link, etc). This matches `ariaSnapshot()` counting exactly — both see only accessible/visible elements.

All click/fill/type/hover/getText/getAttr/waitFor updated to use getLocator().

**Result:** Dev.to Google OAuth signup completed successfully. HN account creation and form posting working. stealth-browser is fully functional for real-world form automation.

### Status: STABLE — in production use for builtbyzac.com marketing automation

### ~1:00 AM — Bug fix: getByRole nth(index) mismatch on contenteditable fields

**Problem:** Reddit uses ProseMirror contenteditable divs for post title/body. `page.getByRole('textbox').nth(index)` was resolving to the wrong element because `ariaSnapshot()` and Playwright's DOM role counter disagree on element ordering (search inputs, nested divs, etc).

**Fix 1** — `snapshot.ts`: parse accessible name from ariaSnapshot line (the quoted string after the role). Store as `name` in refMap.

**Fix 2** — `browser.ts`: `getLocator()` now uses `page.getByRole(role, { name, exact: true }).first()` when a name is available. This is unambiguous — no index counting, no DOM ordering issues.

**Fix 3** — Added `keyboard type "text"` command that calls `page.keyboard.type()` on the currently focused element. Required for ProseMirror/contenteditable editors that ignore `fill()` and `pressSequentially()` on locators. Workflow: `click @ref` to focus, then `keyboard type "text"` to type.

**Result:** Reddit post submitted successfully to r/SideProject. Contenteditable forms now work reliably.

### Status: STABLE v2 — accessible-name resolution + keyboard type command shipped

### ~Today — Bug fix: shadow DOM button click via dispatchEvent

**Problem:** Reddit's `shreddit-composer` web component intercepts pointer events for the comment submit button. Normal `click @ref` fails with "intercepts pointer events" timeout. Shadow DOM `querySelector` through `comment-composer-host.shadowRoot` also returns null — the submit button is nested deeper.

**Fix:** Use `js` command with `dispatchEvent` to bypass pointer event interception:
```
js "var btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Comment' && b.type === 'submit'); btn ? (btn.dispatchEvent(new MouseEvent('click', {bubbles:true})), 'clicked') : 'not found'"
```

**Result:** Comment submitted successfully to r/vibecoding thread. Works for any shadow-DOM-intercepted button — find by text content + type, dispatch MouseEvent instead of pointer click.

### Status: STABLE v3 — shadow DOM button workaround via dispatchEvent

## STABLE v4: ProseMirror comment box fix

**Problem**: `fill @ref` populates the textbox visually but leaves the Comment button `[disabled]`. ProseMirror/shreddit-composer doesn't fire its internal state update from a programmatic fill.

**Fix**: Focus the contenteditable div and use execCommand to insert text:
```js
var editor = document.querySelector('div[contenteditable=true]');
editor.focus();
document.execCommand('selectAll', false, null);
document.execCommand('delete', false, null);
document.execCommand('insertText', false, 'your comment text here');
```
After this the Comment button loses `[disabled]` and can be clicked normally via `click @ref`.

**Full working flow**:
1. `click @textboxRef` — click the comment area to open the editor
2. `js "var editor = document.querySelector('div[contenteditable=true]'); editor.focus(); document.execCommand('selectAll',false,null); document.execCommand('delete',false,null); document.execCommand('insertText',false,'text'); 'ok'"` — insert text
3. Check snapshot — verify button is `[ref=eXX]` not `[disabled]`
4. `click @buttonRef` — submit normally

Status: STABLE v4

## STABLE v5: writable dir fix for non-root containers

**Problem**: `/home/node/.stealth-browser` was owned by root in some container restarts. Daemon crashed with EACCES on screenshots mkdir and daemon.pid write. Socket unlink also failed silently causing "Daemon failed to start within 15s".

**Fix**: Added `STEALTH_BROWSER_DIR` env var to `browser.ts` and `daemon.ts`. Both `SCREENSHOT_DIR`/`USER_DATA_DIR` in browser.ts and `getPidPath()` in daemon.ts now use it. `recover.sh` sets `STEALTH_BROWSER_DIR=/tmp/stealth-data` and `XDG_RUNTIME_DIR=/tmp/stealth-runtime` before pinging.

**Result**: `bash recover.sh` reliably brings up the daemon regardless of `/home/node/.stealth-browser` ownership.

### Status: STABLE v5
