type TimetableOrderable = {
  id?: string | number | null;
  title?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

function timeInMinutes(value: string | null | undefined): number {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Chronological timetable order, with untimed elements listed last. */
export function compareTimetableItems(a: TimetableOrderable, b: TimetableOrderable): number {
  const startA = timeInMinutes(a.start_time);
  const startB = timeInMinutes(b.start_time);
  if (startA !== startB) return startA - startB;

  const endA = timeInMinutes(a.end_time);
  const endB = timeInMinutes(b.end_time);
  if (endA !== endB) return endA - endB;

  const titleDifference = (a.title ?? "").localeCompare(b.title ?? "");
  if (titleDifference !== 0) return titleDifference;

  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

export function timetableTimeLabel(item: TimetableOrderable): string {
  if (item.start_time && item.end_time) return `${item.start_time} – ${item.end_time}`;
  return item.start_time || item.end_time || "No time";
}
