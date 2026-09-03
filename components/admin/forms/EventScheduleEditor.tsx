"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildRangeDays,
  formatRangeDayLabel,
  type EventScheduleFormValue,
  type EventScheduleMode,
} from "@/lib/event-schedule";
import { ImageUpload } from "@/components/admin/image-upload";

function dateFromDateTimeLocal(value: string) {
  return value ? value.slice(0, 10) : "";
}

function timeFromDateTimeLocal(value: string) {
  return value ? value.slice(11, 16) : "";
}

export function EventScheduleEditor({
  value,
  onChange,
  errors,
}: {
  value: EventScheduleFormValue;
  onChange: (value: EventScheduleFormValue) => void;
  errors?: {
    schedule?: string;
    singleDateTime?: string;
    rangeStartDate?: string;
    rangeEndDate?: string;
    rangeDays?: string;
  };
}) {
  const syncRangeDays = (
    startDate: string,
    endDate: string,
    existingDays = value.rangeDays
  ) => {
    const seedStartTime =
      timeFromDateTimeLocal(value.singleDateTime) ||
      existingDays.find((day) => day.enabled && day.startTime)?.startTime ||
      "";

    return buildRangeDays(startDate, endDate, existingDays, seedStartTime);
  };

  const handleModeChange = (mode: EventScheduleMode) => {
    if (mode === "single") {
      const sourceDay =
        value.rangeDays.find((day) => day.enabled && day.startTime) ||
        value.rangeDays[0];
      const nextSingleDateTime =
        value.singleDateTime ||
        (sourceDay?.date
          ? `${sourceDay.date}T${sourceDay.startTime || "19:00"}`
          : "");

      onChange({
        ...value,
        scheduleMode: "single",
        singleDateTime: nextSingleDateTime,
      });
      return;
    }

    const seedDate =
      value.rangeStartDate || dateFromDateTimeLocal(value.singleDateTime);
    const nextStartDate = seedDate || value.rangeStartDate || "";
    const nextEndDate = value.rangeEndDate || nextStartDate;

    onChange({
      ...value,
      scheduleMode: "range",
      rangeStartDate: nextStartDate,
      rangeEndDate: nextEndDate,
      rangeDays: syncRangeDays(nextStartDate, nextEndDate),
    });
  };

  const handleRangeBoundChange = (
    field: "rangeStartDate" | "rangeEndDate",
    nextValue: string
  ) => {
    const nextSchedule = {
      ...value,
      [field]: nextValue,
    };

    onChange({
      ...nextSchedule,
      rangeDays: syncRangeDays(
        field === "rangeStartDate" ? nextValue : nextSchedule.rangeStartDate,
        field === "rangeEndDate" ? nextValue : nextSchedule.rangeEndDate
      ),
    });
  };

  const handleRangeDayChange = (
    targetDay: EventScheduleFormValue["rangeDays"][number],
    patch: Partial<EventScheduleFormValue["rangeDays"][number]>
  ) => {
    onChange({
      ...value,
      rangeDays: value.rangeDays.map((day) =>
        day === targetDay ? { ...day, ...patch } : day
      ),
    });
  };

  const groupedDays = value.rangeDays.reduce((acc, day) => {
    if (!acc[day.date]) acc[day.date] = day;
    return acc;
  }, {} as Record<string, EventScheduleFormValue["rangeDays"][number]>);

  return (
    <Card className={errors?.schedule ? "border-destructive/60" : undefined}>
      <CardHeader>
        <CardTitle className='text-base'>Schedule</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {errors?.schedule ? (
          <p className='text-sm text-destructive'>{errors.schedule}</p>
        ) : null}
        <div className='space-y-2'>
          <Label htmlFor='scheduleMode'>Schedule Type</Label>
          <Select
            value={value.scheduleMode}
            onValueChange={(next) => handleModeChange(next as EventScheduleMode)}
          >
            <SelectTrigger id='scheduleMode' aria-invalid={!!errors?.schedule}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='single'>Single Date</SelectItem>
              <SelectItem value='range'>Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {value.scheduleMode === "single" ? (
          <div className='space-y-2'>
            <Label htmlFor='singleDateTime'>Date and Time</Label>
            <Input
              id='singleDateTime'
              type='datetime-local'
              value={value.singleDateTime}
              onChange={(event) =>
                onChange({
                  ...value,
                  singleDateTime: event.target.value,
                })
              }
              aria-invalid={!!errors?.singleDateTime}
              aria-describedby={
                errors?.singleDateTime ? "single-date-time-error" : undefined
              }
              required
            />
            {errors?.singleDateTime ? (
              <p id='single-date-time-error' className='text-sm text-destructive'>
                {errors.singleDateTime}
              </p>
            ) : null}
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='rangeStartDate'>Start Date</Label>
                <Input
                  id='rangeStartDate'
                  type='date'
                  value={value.rangeStartDate}
                  onChange={(event) =>
                    handleRangeBoundChange("rangeStartDate", event.target.value)
                  }
                  aria-invalid={!!errors?.rangeStartDate}
                  aria-describedby={
                    errors?.rangeStartDate ? "range-start-date-error" : undefined
                  }
                  required
                />
                {errors?.rangeStartDate ? (
                  <p id='range-start-date-error' className='text-sm text-destructive'>
                    {errors.rangeStartDate}
                  </p>
                ) : null}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='rangeEndDate'>End Date</Label>
                <Input
                  id='rangeEndDate'
                  type='date'
                  value={value.rangeEndDate}
                  onChange={(event) =>
                    handleRangeBoundChange("rangeEndDate", event.target.value)
                  }
                  aria-invalid={!!errors?.rangeEndDate}
                  aria-describedby={
                    errors?.rangeEndDate ? "range-end-date-error" : undefined
                  }
                  required
                />
                {errors?.rangeEndDate ? (
                  <p id='range-end-date-error' className='text-sm text-destructive'>
                    {errors.rangeEndDate}
                  </p>
                ) : null}
              </div>
            </div>

            <div className='space-y-3'>
              <div className='text-sm font-medium'>Day-by-day timings</div>
              {errors?.rangeDays ? (
                <p className='text-sm text-destructive'>{errors.rangeDays}</p>
              ) : null}

              {Object.keys(groupedDays).length ? (
                Object.entries(groupedDays).map(([date, day]) => (
                  <div key={date} className='space-y-4 rounded-xl border p-4'>
                    <div className='space-y-1 border-b pb-3'>
                      <div className='text-sm font-medium'>
                        {formatRangeDayLabel(date)}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {date}
                      </div>
                    </div>

                    <div
                      className={`grid gap-3 rounded-xl border p-4 md:grid-cols-[0.8fr,1fr,1fr] bg-muted/20 ${
                        errors?.rangeDays ? "border-destructive/60" : ""
                      }`}
                    >
                      <label className='flex items-center gap-2 text-sm font-medium'>
                            <Checkbox
                              checked={day.enabled}
                              onCheckedChange={(checked) =>
                                handleRangeDayChange(day, {
                                  enabled: Boolean(checked),
                                })
                              }
                            />
                            Active
                      </label>

                      <div className='space-y-2'>
                            <Label htmlFor={`start-${day.id}`}>Start Time</Label>
                            <Input
                              id={`start-${day.id}`}
                              type='time'
                              value={day.startTime}
                              disabled={!day.enabled}
                              onChange={(event) =>
                                handleRangeDayChange(day, {
                                  startTime: event.target.value,
                                })
                              }
                            />
                      </div>

                      <div className='space-y-2'>
                            <Label htmlFor={`end-${day.id}`}>End Time</Label>
                            <Input
                              id={`end-${day.id}`}
                              type='time'
                              value={day.endTime}
                              disabled={!day.enabled}
                              onChange={(event) =>
                                handleRangeDayChange(day, {
                                  endTime: event.target.value,
                                })
                              }
                            />
                      </div>

                      <div className='col-span-full mt-2'>
                        <ImageUpload
                          label='Occurrence specific image (Optional)'
                          value={day.image || ""}
                          onChange={(url) =>
                            handleRangeDayChange(day, { image: url })
                          }
                          allowUrlInput={false}
                        />
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className='text-sm text-muted-foreground'>
                  Select a start and end date to configure daily timings.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
