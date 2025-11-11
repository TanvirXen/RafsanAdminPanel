"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Occurrence = { date: string; season?: number; episode?: number };

export function OccurrenceListEditor({
  value,
  onChange,
}: {
  value?: Occurrence[];
  onChange: (rows: Occurrence[]) => void;
}) {
  const [rows, setRows] = useState<Occurrence[]>(
    value?.length ? value : [{ date: "" }]
  );

  const set = (i: number, patch: Partial<Occurrence>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    setRows(next);
    onChange(next.filter((r) => r.date)); // only keep rows with a date
  };

  return (
    <div className='space-y-3'>
      <Label>Dates (with optional Season/Episode)</Label>

      {rows.map((r, i) => (
        <div key={i} className='grid grid-cols-12 gap-2'>
          <div className='col-span-6'>
            {/* Keep datetime-local so you can capture time too. */}
            <Input
              type='datetime-local'
              value={r.date ? r.date.slice(0, 16) : ""}
              onChange={(e) => set(i, { date: e.target.value })}
              required
            />
          </div>

          <div className='col-span-3'>
            <Input
              type='number'
              placeholder='Season'
              value={r.season ?? ""}
              onChange={(e) =>
                set(i, {
                  season: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              min={1}
            />
          </div>

          <div className='col-span-3'>
            <Input
              type='number'
              placeholder='Episode'
              value={r.episode ?? ""}
              onChange={(e) =>
                set(i, {
                  episode: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              min={1}
            />
          </div>

          <div className='col-span-12 flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                const next = rows.slice();
                next.splice(i, 1);
                setRows(next.length ? next : [{ date: "" }]);
                onChange(next.filter((r) => r.date));
              }}
            >
              Remove
            </Button>

            {i === rows.length - 1 && (
              <Button
                type='button'
                onClick={() => setRows([...rows, { date: "" }])}
              >
                Add another
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
