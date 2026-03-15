export type Command =
  | { action: 'open'; url: string }
  | { action: 'screenshot'; path?: string; full?: boolean }
  | { action: 'snapshot'; interactive?: boolean; compact?: boolean }
  | { action: 'click'; ref: string }
  | { action: 'fill'; ref: string; text: string }
  | { action: 'type'; ref: string; text: string }
  | { action: 'press'; key: string }
  | { action: 'scroll'; direction: 'up' | 'down' | 'left' | 'right'; amount: number }
  | { action: 'hover'; ref: string }
  | { action: 'get'; what: 'text' | 'html' | 'value' | 'title' | 'url' | 'attr'; ref?: string; attr?: string }
  | { action: 'wait'; ref?: string; text?: string; ms?: number }
  | { action: 'close' }
  | { action: 'ping' }

export interface Response {
  ok: boolean
  output?: string
  error?: string
  screenshotPath?: string
}

export interface RefMap {
  [ref: string]: {
    role: string
    name?: string
    selector?: string
    index?: number
  }
}
