const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso))
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' })

export function formatTime(iso: string): string {
  return time.format(new Date(iso))
}
