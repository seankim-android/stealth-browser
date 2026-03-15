import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Browser, BrowserContext, Page } from 'playwright'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Apply stealth plugin — must be done before any launch
chromium.use(StealthPlugin())

const SCREENSHOT_DIR = path.join(os.homedir(), '.stealth-browser', 'screenshots')
const USER_DATA_DIR = path.join(os.homedir(), '.stealth-browser', 'profile')

export class BrowserManager {
  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  public refMap: Record<string, { selector: string; index: number }> = {}

  async launch(): Promise<void> {
    if (this.browser) return

    await mkdir(USER_DATA_DIR, { recursive: true })
    await mkdir(SCREENSHOT_DIR, { recursive: true })

    // launchPersistentContext keeps cookies/storage across sessions
    this.context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? process.env.AGENT_BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium',
      headless: true,
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    })

    const pages = this.context.pages()
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage()

    // Extra stealth: remove webdriver property
    await this.page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      // @ts-ignore
      delete window.__playwright
      // @ts-ignore
      delete window.__pw_manual
    })
  }

  async ensureLaunched(): Promise<Page> {
    if (!this.page || !this.context) {
      await this.launch()
    }
    return this.page!
  }

  async open(url: string): Promise<string> {
    const page = await this.ensureLaunched()
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    const title = await page.title()
    const finalUrl = page.url()
    return `✓ ${title}\n  ${finalUrl}`
  }

  async screenshot(filePath?: string, full = false): Promise<string> {
    const page = await this.ensureLaunched()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = filePath ?? path.join(SCREENSHOT_DIR, `screenshot-${timestamp}.png`)
    if (!existsSync(path.dirname(filename))) {
      await mkdir(path.dirname(filename), { recursive: true })
    }
    await page.screenshot({ path: filename, fullPage: full })
    return `✓ Screenshot saved to ${filename}`
  }

  async getTitle(): Promise<string> {
    const page = await this.ensureLaunched()
    return page.title()
  }

  async getUrl(): Promise<string> {
    const page = await this.ensureLaunched()
    return page.url()
  }

  async click(ref: string): Promise<string> {
    const page = await this.ensureLaunched()
    const entry = this.refMap[ref]
    if (!entry) throw new Error(`Unknown ref: ${ref}`)
    const locator = page.locator(entry.selector).nth(entry.index)
    await locator.click({ timeout: 10000 })
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    return `✓ Clicked ${ref}`
  }

  async fill(ref: string, text: string): Promise<string> {
    const page = await this.ensureLaunched()
    const entry = this.refMap[ref]
    if (!entry) throw new Error(`Unknown ref: ${ref}`)
    const locator = page.locator(entry.selector).nth(entry.index)
    await locator.fill(text, { timeout: 10000 })
    return `✓ Filled ${ref} with "${text}"`
  }

  async type(ref: string, text: string): Promise<string> {
    const page = await this.ensureLaunched()
    const entry = this.refMap[ref]
    if (!entry) throw new Error(`Unknown ref: ${ref}`)
    const locator = page.locator(entry.selector).nth(entry.index)
    await locator.pressSequentially(text, { delay: 50 })
    return `✓ Typed "${text}" into ${ref}`
  }

  async press(key: string): Promise<string> {
    const page = await this.ensureLaunched()
    await page.keyboard.press(key)
    return `✓ Pressed ${key}`
  }

  async scroll(direction: string, amount: number): Promise<string> {
    const page = await this.ensureLaunched()
    const x = direction === 'left' ? -amount : direction === 'right' ? amount : 0
    const y = direction === 'up' ? -amount : direction === 'down' ? amount : 0
    await page.mouse.wheel(x, y)
    await page.waitForTimeout(300)
    return `✓ Scrolled ${direction} ${amount}px`
  }

  async hover(ref: string): Promise<string> {
    const page = await this.ensureLaunched()
    const entry = this.refMap[ref]
    if (!entry) throw new Error(`Unknown ref: ${ref}`)
    await page.locator(entry.selector).nth(entry.index).hover()
    return `✓ Hovered over ${ref}`
  }

  async getText(ref: string): Promise<string> {
    const page = await this.ensureLaunched()
    const entry = this.refMap[ref]
    if (!entry) throw new Error(`Unknown ref: ${ref}`)
    return (await page.locator(entry.selector).nth(entry.index).textContent()) ?? ''
  }

  async getAttr(ref: string, attr: string): Promise<string> {
    const page = await this.ensureLaunched()
    const entry = this.refMap[ref]
    if (!entry) throw new Error(`Unknown ref: ${ref}`)
    return (await page.locator(entry.selector).nth(entry.index).getAttribute(attr)) ?? ''
  }

  async waitFor(opts: { ref?: string; text?: string; ms?: number }): Promise<string> {
    const page = await this.ensureLaunched()
    if (opts.ms) {
      await page.waitForTimeout(opts.ms)
      return `✓ Waited ${opts.ms}ms`
    }
    if (opts.text) {
      await page.waitForSelector(`text="${opts.text}"`, { timeout: 15000 })
      return `✓ Found text "${opts.text}"`
    }
    if (opts.ref) {
      const entry = this.refMap[opts.ref]
      if (!entry) throw new Error(`Unknown ref: ${opts.ref}`)
      await page.locator(entry.selector).nth(entry.index).waitFor({ timeout: 15000 })
      return `✓ Element ${opts.ref} is visible`
    }
    return '✓ Done waiting'
  }

  async close(): Promise<string> {
    if (this.context) {
      await this.context.close()
      this.context = null
      this.page = null
    }
    return '✓ Browser closed'
  }

  getPage(): Page | null {
    return this.page
  }

  getContext(): BrowserContext | null {
    return this.context
  }
}
