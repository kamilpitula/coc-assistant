import { parse as parseYaml } from 'yaml'

export type PbiStatus = 'todo' | 'done' | 'dropped'

export interface Pbi {
  path: string
  id: string
  status: PbiStatus
  blockedBy: string[]
  pr?: number
  verification: VerificationItem[]
  followUps: FollowUp[]
}

export interface VerificationItem {
  ticked: boolean
  text: string
}

export interface FollowUp {
  text: string
  promotedTo: string | null
}

export type ParseResult =
  | { ok: true; pbi: Pbi }
  | { ok: false; path: string; errors: string[] }

export const pbiIdPattern = /^PBI-[A-Z0-9]+-\d{3}$/
const statuses: readonly string[] = ['todo', 'done', 'dropped']
const knownKeys: readonly string[] = ['id', 'status', 'blocked_by', 'pr']
const frontmatterPattern = /^---\n([\s\S]*?)\n---(?:\n|$)/

export function parsePbiFile(path: string, text: string): ParseResult {
  const normalized = text.replace(/\r\n/g, '\n')
  const match = frontmatterPattern.exec(normalized)
  if (!match) {
    return { ok: false, path, errors: ['missing frontmatter'] }
  }
  const data = readYamlMapping(match[1])
  if (typeof data === 'string') {
    return { ok: false, path, errors: [data] }
  }
  const errors = validateFrontmatter(data)
  if (errors.length > 0) {
    return { ok: false, path, errors }
  }
  return { ok: true, pbi: toPbi(path, data, normalized.slice(match[0].length)) }
}

function readYamlMapping(yamlText: string): Record<string, unknown> | string {
  let data: unknown
  try {
    data = parseYaml(yamlText)
  } catch {
    return 'frontmatter is not valid YAML'
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return 'frontmatter must be a mapping'
  }
  return data as Record<string, unknown>
}

function validateFrontmatter(data: Record<string, unknown>): string[] {
  const errors: string[] = []
  if (!isPbiId(data.id)) {
    errors.push('id must look like PBI-<AREA>-<NNN>')
  }
  if (typeof data.status !== 'string' || !statuses.includes(data.status)) {
    errors.push('status must be one of todo, done, dropped')
  }
  if (!Array.isArray(data.blocked_by) || !data.blocked_by.every(isPbiId)) {
    errors.push('blocked_by must be a list of PBI ids')
  }
  if ('pr' in data && !(Number.isInteger(data.pr) && (data.pr as number) > 0)) {
    errors.push('pr must be a positive integer')
  }
  for (const key of Object.keys(data).filter((key) => !knownKeys.includes(key))) {
    errors.push(`unknown frontmatter key: ${key}`)
  }
  return errors
}

function isPbiId(value: unknown): value is string {
  return typeof value === 'string' && pbiIdPattern.test(value)
}

function toPbi(path: string, data: Record<string, unknown>, body: string): Pbi {
  const pbi: Pbi = {
    path,
    id: data.id as string,
    status: data.status as PbiStatus,
    blockedBy: data.blocked_by as string[],
    verification: readVerificationItems(sectionLines(body, 'Verification')),
    followUps: readFollowUps(sectionLines(body, 'Follow-ups')),
  }
  if ('pr' in data) {
    pbi.pr = data.pr as number
  }
  return pbi
}

function sectionLines(body: string, heading: string): string[] {
  const lines = body.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) {
    return []
  }
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
  return lines.slice(start + 1, end === -1 ? lines.length : end)
}

function readVerificationItems(lines: string[]): VerificationItem[] {
  return lines.flatMap((line) => {
    const item = /^- \[([ xX])\] (.*)$/.exec(line)
    return item ? [{ ticked: item[1] !== ' ', text: item[2].trim() }] : []
  })
}

function readFollowUps(lines: string[]): FollowUp[] {
  return lines.flatMap((line) => {
    const entry = /^[-*] (.*)$/.exec(line)
    if (!entry) {
      return []
    }
    const promotion = /->\s*(PBI-[A-Z0-9]+-\d{3})/.exec(entry[1])
    return [{ text: entry[1].trim(), promotedTo: promotion ? promotion[1] : null }]
  })
}
