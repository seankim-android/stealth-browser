#!/usr/bin/env node
/**
 * stealth-browser CLI
 * Sends commands to the daemon process via Unix socket.
 * Auto-starts the daemon if not running.
 */
import * as net from 'node:net'
import * as fs from 'node:fs'
import * as child_process from 'node:child_process'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSocketPath, getPidPath } from './daemon.js'
import type { Command, Response } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function isDaemonRunning(): boolean {
  const socketPath = getSocketPath()
  const pidPath = getPidPath()
  if (!fs.existsSync(socketPath) || !fs.existsSync(pidPath)) return false
  try {
    const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim())
    process.kill(pid, 0) // throws if process doesn't exist
    return true
  } catch {
    return false
  }
}

async function startDaemon(): Promise<void> {
  return new Promise((resolve, reject) => {
    const daemonScript = path.join(__dirname, 'daemon.js')
    const child = child_process.fork(daemonScript, ['--daemon'], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    })

    const timeout = setTimeout(() => {
      reject(new Error('Daemon failed to start within 15s'))
    }, 15000)

    child.on('message', (msg) => {
      if (msg === 'ready') {
        clearTimeout(timeout)
        child.disconnect()
        child.unref()
        resolve()
      }
    })

    child.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

async function sendCommand(cmd: Command): Promise<Response> {
  // Ensure daemon is running
  if (!isDaemonRunning()) {
    process.stderr.write('Starting stealth-browser daemon...\n')
    await startDaemon()
  }

  return new Promise((resolve, reject) => {
    const socketPath = getSocketPath()
    const client = net.createConnection(socketPath)
    let buffer = ''

    client.on('connect', () => {
      client.write(JSON.stringify(cmd) + '\n')
    })

    client.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          resolve(JSON.parse(line) as Response)
          client.destroy()
        } catch {
          reject(new Error('Invalid response from daemon'))
        }
      }
    })

    client.on('error', (err) => reject(err))

    setTimeout(() => reject(new Error('Command timed out after 30s')), 30000)
  })
}

function parseArgs(argv: string[]): Command {
  const args = argv.slice(2) // remove 'node' and script path

  const action = args[0]

  switch (action) {
    case 'open':
      if (!args[1]) throw new Error('Usage: stealth-browser open <url>')
      return { action: 'open', url: args[1] }

    case 'screenshot': {
      const filePath = args.find((a) => !a.startsWith('-') && a !== 'screenshot')
      const full = args.includes('--full')
      return { action: 'screenshot', path: filePath, full }
    }

    case 'snapshot': {
      const interactive = args.includes('-i') || args.includes('--interactive')
      const compact = args.includes('-c') || args.includes('--compact')
      return { action: 'snapshot', interactive, compact }
    }

    case 'click':
      if (!args[1]) throw new Error('Usage: stealth-browser click @ref')
      return { action: 'click', ref: args[1].replace('@', '') }

    case 'fill':
      if (!args[1] || !args[2]) throw new Error('Usage: stealth-browser fill @ref "text"')
      return { action: 'fill', ref: args[1].replace('@', ''), text: args[2] }

    case 'type':
      if (!args[1] || !args[2]) throw new Error('Usage: stealth-browser type @ref "text"')
      return { action: 'type', ref: args[1].replace('@', ''), text: args[2] }

    case 'press':
      if (!args[1]) throw new Error('Usage: stealth-browser press <key>')
      return { action: 'press', key: args[1] }

    case 'scroll': {
      const direction = (args[1] ?? 'down') as 'up' | 'down' | 'left' | 'right'
      const amount = parseInt(args[2] ?? '500')
      return { action: 'scroll', direction, amount }
    }

    case 'hover':
      if (!args[1]) throw new Error('Usage: stealth-browser hover @ref')
      return { action: 'hover', ref: args[1].replace('@', '') }

    case 'get': {
      const what = args[1] as 'text' | 'title' | 'url' | 'html' | 'value' | 'attr'
      const ref = args[2]?.replace('@', '')
      const attr = args[3]
      return { action: 'get', what, ref, attr }
    }

    case 'wait': {
      const ms = args.find((a) => /^\d+$/.test(a))
      const text = args.find((a) => a.startsWith('--text='))?.replace('--text=', '')
      const ref = args.find((a) => a.startsWith('@'))?.replace('@', '')
      return { action: 'wait', ms: ms ? parseInt(ms) : undefined, text, ref }
    }

    case 'click-at': {
      const x = parseInt(args[1])
      const y = parseInt(args[2])
      if (isNaN(x) || isNaN(y)) throw new Error('Usage: stealth-browser click-at <x> <y>')
      return { action: 'click-at', x, y }
    }

    case 'js': {
      const code = args.slice(1).join(' ')
      if (!code) throw new Error('Usage: stealth-browser js "<javascript>"')
      return { action: 'js', code }
    }

    case 'upload': {
      if (!args[1] || !args[2]) throw new Error('Usage: stealth-browser upload <file:N> /path/to/file')
      return { action: 'upload', ref: args[1].replace('@', ''), filePath: args[2] }
    }

    case 'close':
      return { action: 'close' }

    case 'ping':
      return { action: 'ping' }

    default:
      throw new Error(
        `Unknown command: ${action}\n\nUsage:\n` +
          `  stealth-browser open <url>\n` +
          `  stealth-browser screenshot [path] [--full]\n` +
          `  stealth-browser snapshot [-i] [-c]\n` +
          `  stealth-browser click @ref\n` +
          `  stealth-browser fill @ref "text"\n` +
          `  stealth-browser type @ref "text"\n` +
          `  stealth-browser press <key>\n` +
          `  stealth-browser scroll [up|down|left|right] [px]\n` +
          `  stealth-browser get [title|url|text|attr] [@ref] [attr]\n` +
          `  stealth-browser wait [ms|--text="..." |@ref]\n` +
          `  stealth-browser close\n`,
      )
  }
}

async function main() {
  let cmd: Command
  try {
    cmd = parseArgs(process.argv)
  } catch (err) {
    process.stderr.write((err as Error).message + '\n')
    process.exit(1)
  }

  let resp: Response
  try {
    resp = await sendCommand(cmd)
  } catch (err) {
    process.stderr.write(`\x1b[31m✗\x1b[0m ${(err as Error).message}\n`)
    process.exit(1)
  }

  if (resp.ok) {
    if (resp.output) process.stdout.write('\x1b[32m✓\x1b[0m ' + resp.output + '\n')
  } else {
    process.stderr.write(`\x1b[31m✗\x1b[0m ${resp.error}\n`)
    process.exit(1)
  }
}

main()
