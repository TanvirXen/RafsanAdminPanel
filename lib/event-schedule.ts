"use client";

import { isoToLocalInput, localInputToIso } from "@/lib/tz";

export type EventCategory = "what_a_show" | "other";
export type EventScheduleMode = "single" | "range";

export type LegacyOccurrence = {
  date: string;
  season?: number;
  episode?: number;
};

export type RangeDay = {
  date: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type EventScheduleShape = {
  scheduleMode?: string;
  singleDateTime?: string | null;
  rangeStartDate?: string;
  rangeEndDate?: string;
  rangeDays?: RangeDay[];
  occurrences?: LegacyOccurrence[];
  date?: string[];
};

export type EventScheduleFormValue = {
  scheduleMode: EventScheduleMode;
  singleDateTime: string;
  rangeStartDate: string;
  rangeEndDate: string;
  rangeDays: RangeDay[];
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateOnly(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

function normalizeDateOnly(value: string) {
  const trimmed = String(value || "").trim();
  return DATE_ONLY_RE.test(trimmed) ? trimmed : "";
}

function normalizeTimeOnly(value: string) {
  return String(value || "").trim().slice(0, 5);
}

function sortOccurrences(occurrences: LegacyOccurrence[] = []) {
  return [...occurrences].sort(
    (left, right) =>
      new Date(left.date).getTime() - new Date(right.date).getTime()
  );
}

function toRangeDayFromOccurrence(occurrence: LegacyOccurrence): RangeDay | null {
  const localValue = isoToLocalInput(occurrence.date);
  if (!localValue) {
    return null;
  }

  return {
    date: localValue.slice(0, 10),
    enabled: true,
    startTime: localValue.slice(11, 16),
    endTime: "",
  };
}

export function normalizeEventCategoryValue(value?: string | null): EventCategory {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "what_a_show") {
    return "what_a_show";
  }

  return "other";
}

export function buildRangeDays(
  startDate: string,
  endDate: string,
  existingDays: RangeDay[] = [],
  seedStartTime = ""
) {
  const normalizedStart = normalizeDateOnly(startDate);
  const normalizedEnd = normalizeDateOnly(endDate);

  if (!normalizedStart || !normalizedEnd || normalizedStart > normalizedEnd) {
    return [];
  }

  const byDate = existingDays.reduce<Map<string, RangeDay>>((map, day) => {
    const normalizedDate = normalizeDateOnly(day?.date || "");
    if (!normalizedDate) {
      return map;
    }

    map.set(normalizedDate, {
      date: normalizedDate,
      enabled: Boolean(day.enabled),
      startTime: normalizeTimeOnly(day.startTime),
      endTime: normalizeTimeOnly(day.endTime),
    });

    return map;
  }, new Map<string, RangeDay>());

  const days: RangeDay[] = [];
  const cursor = parseDateOnly(normalizedStart);
  const last = parseDateOnly(normalizedEnd);

  while (cursor.getTime() <= last.getTime()) {
    const date = formatDateOnly(cursor);
    const existing = byDate.get(date);

    days.push(
      existing || {
        date,
        enabled: true,
        startTime: seedStartTime,
        endTime: "",
      }
    );

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

export function inferScheduleFromEvent(
  input?: EventScheduleShape | null
): EventScheduleFormValue {
  const safeInput = input || {};
  const legacyOccurrences = sortOccurrences(
    Array.isArray(safeInput.occurrences) && safeInput.occurrences.length
      ? safeInput.occurrences
      : (safeInput.date || []).map((value) => ({ date: value }))
  );

  if (safeInput.scheduleMode === "range") {
    const rangeStartDate = normalizeDateOnly(safeInput.rangeStartDate || "");
    const rangeEndDate = normalizeDateOnly(safeInput.rangeEndDate || "");
    const providedDays = Array.isArray(safeInput.rangeDays)
      ? safeInput.rangeDays.map((day) => ({
          date: normalizeDateOnly(day.date),
          enabled: typeof day.enabled === "boolean" ? day.enabled : true,
          startTime: normalizeTimeOnly(day.startTime),
          endTime: normalizeTimeOnly(day.endTime),
        }))
      : [];
    const legacyDays = legacyOccurrences
      .map(toRangeDayFromOccurrence)
      .filter(Boolean) as RangeDay[];

    return {
      scheduleMode: "range",
      singleDateTime: "",
      rangeStartDate,
      rangeEndDate,
      rangeDays: buildRangeDays(
        rangeStartDate,
        rangeEndDate,
        providedDays.length ? providedDays : legacyDays
      ),
    };
  }

  if (safeInput.scheduleMode === "single" && safeInput.singleDateTime) {
    return {
      scheduleMode: "single",
      singleDateTime: isoToLocalInput(safeInput.singleDateTime) || "",
      rangeStartDate: "",
      rangeEndDate: "",
      rangeDays: [],
    };
  }

  if (legacyOccurrences.length === 1) {
    return {
      scheduleMode: "single",
      singleDateTime: isoToLocalInput(legacyOccurrences[0].date) || "",
      rangeStartDate: "",
      rangeEndDate: "",
      rangeDays: [],
    };
  }

  if (legacyOccurrences.length > 1) {
    const rangeDays = legacyOccurrences
      .map(toRangeDayFromOccurrence)
      .filter(Boolean) as RangeDay[];
    const rangeStartDate = rangeDays[0]?.date || "";
    const rangeEndDate = rangeDays[rangeDays.length - 1]?.date || "";

    return {
      scheduleMode: "range",
      singleDateTime: "",
      rangeStartDate,
      rangeEndDate,
      rangeDays: buildRangeDays(rangeStartDate, rangeEndDate, rangeDays),
    };
  }

  return {
    scheduleMode: "single",
    singleDateTime: "",
    rangeStartDate: "",
    rangeEndDate: "",
    rangeDays: [],
  };
}

export function buildSchedulePayload(value: EventScheduleFormValue) {
  if (value.scheduleMode === "single") {
    return {
      scheduleMode: "single" as const,
      singleDateTime: value.singleDateTime
        ? localInputToIso(value.singleDateTime)
        : "",
    };
  }

  return {
    scheduleMode: "range" as const,
    rangeStartDate: value.rangeStartDate,
    rangeEndDate: value.rangeEndDate,
    rangeDays: value.rangeDays.map((day) => ({
      date: day.date,
      enabled: Boolean(day.enabled),
      startTime: normalizeTimeOnly(day.startTime),
      endTime: normalizeTimeOnly(day.endTime),
    })),
  };
}

export function formatScheduleSummary(input?: EventScheduleShape | null) {
  const schedule = inferScheduleFromEvent(input);

  if (schedule.scheduleMode === "single") {
    if (!schedule.singleDateTime) {
      return "-";
    }

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Dhaka",
    }).format(new Date(localInputToIso(schedule.singleDateTime)));
  }

  if (!schedule.rangeStartDate || !schedule.rangeEndDate) {
    return "-";
  }

  const activeDays = schedule.rangeDays.filter(
    (day) => day.enabled && day.startTime
  ).length;
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return `${formatter.format(parseDateOnly(schedule.rangeStartDate))} - ${formatter.format(
    parseDateOnly(schedule.rangeEndDate)
  )} | ${activeDays} active day${activeDays === 1 ? "" : "s"}`;
}

export function formatRangeDayLabel(date: string) {
  const normalized = normalizeDateOnly(date);
  if (!normalized) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(normalized));
}
