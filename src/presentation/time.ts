const pad = (value: number) => String(value).padStart(2, "0");

export function formatNodeTime(timestamp: number, now = Date.now()): string {
  const value = new Date(timestamp);
  const current = new Date(now);
  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  const isToday =
    value.getFullYear() === current.getFullYear() &&
    value.getMonth() === current.getMonth() &&
    value.getDate() === current.getDate();
  return isToday ? time : `${pad(value.getMonth() + 1)}/${pad(value.getDate())} ${time}`;
}

export function toDateTime(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
