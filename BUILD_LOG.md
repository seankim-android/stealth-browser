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
