import type { BacklogReport } from './backlog.ts'

const statusColumnWidth = 'in-progress'.length

export function formatReport(report: BacklogReport, invalidFileErrors: string[]): string {
  const sections = [
    section('Status', report.entries.map((entry) => {
      const blockers = entry.blockedBy.length > 0 ? `  blocked by ${entry.blockedBy.join(', ')}` : ''
      return `${entry.status.padEnd(statusColumnWidth)}  ${entry.id}  ${entry.path}${blockers}`
    })),
    section('Ready', report.ready),
    section('Unpromoted follow-ups', report.unpromotedFollowUps.map((followUp) => `${followUp.id}: ${followUp.text}`)),
    section('Git mismatch warnings', report.warnings),
  ]
  if (invalidFileErrors.length > 0) {
    sections.push(section('Invalid PBI files (excluded above; run --check)', invalidFileErrors))
  }
  return sections.join('\n')
}

export function formatCheck(errors: string[], fileCount: number): string {
  if (errors.length === 0) {
    return `backlog check passed (${fileCount} PBI files)\n`
  }
  return section(`backlog check failed with ${errors.length} error(s)`, errors)
}

function section(title: string, lines: string[]): string {
  const body = lines.length > 0 ? lines : ['(none)']
  return [title, ...body.map((line) => `  ${line}`)].join('\n') + '\n'
}
