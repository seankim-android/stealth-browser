import type { Page } from 'playwright'

const INTERACTIVE_ROLES = new Set([
  'link', 'button', 'checkbox', 'radio', 'textbox', 'searchbox',
  'combobox', 'listbox', 'menuitem', 'tab', 'switch', 'option',
  'spinbutton', 'slider', 'menuitemcheckbox', 'menuitemradio',
  'treeitem', 'gridcell',
])

const ROLE_SELECTORS: Record<string, string> = {
  link: 'a[href]',
  button: 'button, [role="button"]',
  textbox: 'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea',
  searchbox: 'input[type="search"]',
  checkbox: 'input[type="checkbox"]',
  radio: 'input[type="radio"]',
  combobox: 'select, [role="combobox"]',
  menuitem: '[role="menuitem"]',
  tab: '[role="tab"]',
  switch: '[role="switch"]',
  slider: 'input[type="range"], [role="slider"]',
  spinbutton: 'input[type="number"], [role="spinbutton"]',
}

/**
 * Build an accessibility snapshot using ariaSnapshot() (Playwright 1.44+).
 * Assigns @eN refs to interactive elements and populates the refMap.
 */
export async function buildSnapshot(
  page: Page,
  refMap: Record<string, { selector: string; index: number }>,
  interactiveOnly = false,
  compact = false,
): Promise<string> {
  const raw = await (page.locator('body') as any).ariaSnapshot().catch(() => '')
  if (!raw) return '(empty page)'

  const lines = (raw as string).split('\n')
  const annotated: string[] = []
  const roleCounters: Record<string, number> = {}
  let globalRef = 1

  for (const line of lines) {
    const roleMatch = line.match(/^(\s*)-\s+(\w[\w-]*)/)
    if (!roleMatch) {
      if (!interactiveOnly) annotated.push(line)
      continue
    }

    const role = roleMatch[2].toLowerCase()
    const isInteractive = INTERACTIVE_ROLES.has(role)

    if (isInteractive) {
      const ref = `e${globalRef++}`
      const displayLine = compact ? line.slice(0, 120) : line
      annotated.push(displayLine + ` [ref=${ref}]`)

      const selector = ROLE_SELECTORS[role] ?? `[role="${role}"]`
      const idx = roleCounters[role] ?? 0
      roleCounters[role] = idx + 1
      refMap[ref] = { selector, index: idx }
    } else {
      if (!interactiveOnly) annotated.push(line)
    }
  }

  return annotated.join('\n')
}
