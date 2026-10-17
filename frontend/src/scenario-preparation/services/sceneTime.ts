/** A Scene's start or finish time as "12 Oct 2026, 19:40" in the viewer's locale and time zone (specs/scenario-preparation/ux.md section 12). */
export function formatSceneTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}
