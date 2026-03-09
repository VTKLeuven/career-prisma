import type { Speaker } from '@/lib/schema'

/** Get speakers that share the same time slot as the given speaker. Returns at least the speaker itself. */
export function getSpeakersInSameTimeSlot(speaker: Speaker, allSpeakers: Speaker[]): Speaker[] {
  const key = speaker.time?.id ?? (speaker.time ? `${speaker.time.start_time ?? ''}-${speaker.time.end_time ?? ''}` : `no-time-${speaker.id}`)
  return allSpeakers.filter((s) => {
    const sKey = s.time?.id ?? (s.time ? `${s.time.start_time ?? ''}-${s.time.end_time ?? ''}` : `no-time-${s.id}`)
    return sKey === key
  })
}

/** Parse "HH:mm" or "HH:mm:ss" to minutes since midnight for chronological sort. */
export function parseTimeToMinutes(t: string | undefined): number {
  if (!t) return Infinity
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Group speakers by time slot. Same time = one group. Returns array of groups in chronological order. */
export function groupSpeakersByTimeSlot(speakers: Speaker[]): Speaker[][] {
  const byKey = new Map<string, Speaker[]>()
  for (const s of speakers) {
    const key = s.time?.id ?? (s.time ? `${s.time.start_time ?? ''}-${s.time.end_time ?? ''}` : `no-time-${s.id}`)
    const list = byKey.get(key) ?? []
    list.push(s)
    byKey.set(key, list)
  }
  const groups = Array.from(byKey.values())
  groups.sort((a, b) => {
    const startA = a[0]?.time?.start_time
    const startB = b[0]?.time?.start_time
    const minA = parseTimeToMinutes(startA)
    const minB = parseTimeToMinutes(startB)
    return minA - minB
  })
  return groups
}
