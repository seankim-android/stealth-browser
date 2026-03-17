/**
 * Daemon process: holds the browser open, listens on a Unix socket,
 * processes commands from the CLI.
 */
import * as net from 'node:net'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { BrowserManager } from './browser.js'
import { buildSnapshot } from './snapshot.js'
import type { Command, Response } from './types.js'

export function getSocketPath(): string {
  const dir = process.env.XDG_RUNTIME_DIR ?? path.join(os.homedir(), '.stealth-browser')
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'stealth-browser.sock')
}

export function getPidPath(): string {
  return path.join(os.homedir(), '.stealth-browser', 'daemon.pid')
}

async function handleCommand(manager: BrowserManager, cmd: Command): Promise<Response> {
  try {
    switch (cmd.action) {
      case 'ping':
        return { ok: true, output: 'pong' }

      case 'open': {
        const out = await manager.open(cmd.url)
        return { ok: true, output: out }
      }

      case 'screenshot': {
        const out = await manager.screenshot(cmd.path, cmd.full)
        const filePath = cmd.path ?? out.split('to ')[1]
        return { ok: true, output: out, screenshotPath: filePath }
      }

      case 'snapshot': {
        const page = manager.getPage()
        if (!page) return { ok: false, error: 'No page open. Run `open <url>` first.' }
        manager.refMap = {}
        const snap = await buildSnapshot(page, manager.refMap, cmd.interactive ?? false, cmd.compact ?? false)
        return { ok: true, output: snap }
      }

      case 'click': {
        const out = await manager.click(cmd.ref)
        return { ok: true, output: out }
      }

      case 'fill': {
        const out = await manager.fill(cmd.ref, cmd.text)
        return { ok: true, output: out }
      }

      case 'type': {
        const out = await manager.type(cmd.ref, cmd.text)
        return { ok: true, output: out }
      }

      case 'press': {
        const out = await manager.press(cmd.key)
        return { ok: true, output: out }
      }

      case 'keyboard-type': {
        const out = await manager.keyboardType(cmd.text)
        return { ok: true, output: out }
      }

      case 'scroll': {
        const out = await manager.scroll(cmd.direction, cmd.amount)
        return { ok: true, output: out }
      }

      case 'hover': {
        const out = await manager.hover(cmd.ref)
        return { ok: true, output: out }
      }

      case 'get': {
        let val: string
        if (cmd.what === 'title') val = await manager.getTitle()
        else if (cmd.what === 'url') val = await manager.getUrl()
        else if (cmd.what === 'text') val = await manager.getText(cmd.ref!)
        else if (cmd.what === 'attr') val = await manager.getAttr(cmd.ref!, cmd.attr!)
        else val = ''
        return { ok: true, output: val }
      }

      case 'wait': {
        const out = await manager.waitFor({ ref: cmd.ref, text: cmd.text, ms: cmd.ms })
        return { ok: true, output: out }
      }

      case 'click-at': {
        const page = manager.getPage()
        if (!page) return { ok: false, error: 'No page open. Run `open <url>` first.' }
        await page.mouse.click(cmd.x, cmd.y)
        return { ok: true, output: `Clicked at (${cmd.x}, ${cmd.y})` }
      }

      case 'js': {
        const page = manager.getPage()
        if (!page) return { ok: false, error: 'No page open. Run `open <url>` first.' }
        const result = await page.evaluate(cmd.code)
        return { ok: true, output: result != null ? String(result) : 'done' }
      }

      case 'upload': {
        const out = await manager.upload(cmd.ref, cmd.filePath)
        return { ok: true, output: out }
      }

      case 'close': {
        const out = await manager.close()
        return { ok: true, output: out }
      }

      default:
        return { ok: false, error: `Unknown action` }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function startDaemon(): Promise<void> {
  const socketPath = getSocketPath()
  const pidPath = getPidPath()

  // Clean up stale socket
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath)
  }

  const manager = new BrowserManager()
  // Pre-launch browser so first command is fast
  await manager.launch()

  const connectionHandler = (socket: net.Socket) => {
    let buffer = ''

    socket.on('data', (chunk) => {
      buffer += chunk.toString()
      // Commands are newline-delimited JSON
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        let cmd: Command
        try {
          cmd = JSON.parse(line) as Command
        } catch {
          const resp: Response = { ok: false, error: 'Invalid JSON command' }
          socket.write(JSON.stringify(resp) + '\n')
          continue
        }

        handleCommand(manager, cmd).then((resp) => {
          socket.write(JSON.stringify(resp) + '\n')
        })
      }
    })

    socket.on('error', () => {})
  }

  const server = net.createServer(connectionHandler)

  server.listen(socketPath, () => {
    // Write PID file
    fs.mkdirSync(path.dirname(pidPath), { recursive: true })
    fs.writeFileSync(pidPath, String(process.pid))

    // Also listen on TCP for Docker containers (macOS Docker can't mount Unix sockets).
    // Port is configurable via STEALTH_BROWSER_TCP_PORT (default: 9224).
    const tcpPort = parseInt(process.env.STEALTH_BROWSER_TCP_PORT ?? '9224')
    const tcpServer = net.createServer(connectionHandler)
    tcpServer.listen(tcpPort, '127.0.0.1', () => {
      process.stderr.write(`Daemon TCP relay on port ${tcpPort}\n`)
    })
    tcpServer.on('error', (err) => {
      process.stderr.write(`TCP relay failed (port ${tcpPort}): ${(err as NodeJS.ErrnoException).message}\n`)
    })

    // Signal ready to parent
    if (process.send) process.send('ready')
  })

  // Clean up on exit
  process.on('exit', () => {
    try { fs.unlinkSync(socketPath) } catch {}
    try { fs.unlinkSync(pidPath) } catch {}
  })
  process.on('SIGTERM', () => process.exit(0))
  process.on('SIGINT', () => process.exit(0))
}

// If run directly as the daemon process
if (process.argv[2] === '--daemon') {
  startDaemon().catch((err) => {
    console.error('Daemon failed to start:', err)
    process.exit(1)
  })
}
