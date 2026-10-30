export function localDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]),
    month = Number(match[2]) - 1,
    day = Number(match[3]);
  if (year < 1) return undefined;
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : undefined;
}
export function dateString(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
