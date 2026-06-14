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

  const set = (index: number, patch: Partial<Occurrence>) => {
    const nextRows = rows.slice();
    nextRows[index] = { ...nextRows[index], ...patch };
    setRows(nextRows);
    onChange(nextRows.filter((row) => row.date));
  };

  return (
    <div className='space-y-3'>
      <Label>Dates (with optional Season/Episode)</Label>

      {rows.map((row, index) => (
        <div key={index} className='grid grid-cols-12 gap-2'>
          <div className='col-span-6'>
            <Input
              type='datetime-local'
              value={row.date ? row.date.slice(0, 16) : ""}
              onChange={(event) => set(index, { date: event.target.value })}
              required
            />
          </div>

          <div className='col-span-3'>
            <Input
              type='number'
              placeholder='Season'
              value={row.season ?? ""}
              onChange={(event) =>
                set(index, {
                  season: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
              min={1}
            />
          </div>

          <div className='col-span-3'>
            <Input
              type='number'
              placeholder='Episode'
              value={row.episode ?? ""}
              onChange={(event) =>
                set(index, {
                  episode: event.target.value
                    ? Number(event.target.value)
                    : undefined,
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
                const nextRows = rows.slice();
                nextRows.splice(index, 1);
                setRows(nextRows.length ? nextRows : [{ date: "" }]);
                onChange(nextRows.filter((row) => row.date));
              }}
            >
              Remove
            </Button>

            {index === rows.length - 1 && (
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
