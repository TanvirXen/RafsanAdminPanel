// lib/tz.ts
export const TZ = "Asia/Dhaka";
const OFFSET = "+06:00"; // Bangladesh has no DST

/** For <input type="datetime-local"> value (YYYY-MM-DDTHH:mm) pinned to BD */
export function isoToLocalInput(iso: string, tz: string = TZ) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${m.year}-${m.month}-${m.day}T${m.hour}:${m.minute}`;
}

/** Turn a datetime-local value into an ISO instants as BD time */
export function localInputToIso(local: string) {
  if (!local) return "";
  // Treat the naive local string as BD wall time
  return new Date(`${local}:00${OFFSET}`).toISOString();
}

/** Detect if an incoming string already has timezone info */
export function hasTZ(s: string) {
  return /[zZ]|[+\-]\d{2}:\d{2}$/.test(s);
}
