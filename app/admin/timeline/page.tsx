"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { runBulkDelete } from "@/lib/bulk-actions";
import { resolvePagination } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TimelineForm,
  type TimelineFormData,
} from "@/components/admin/forms/timeline-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Eye,
  ImageIcon,
  List,
  Tag,
} from "lucide-react";
import { toast } from "react-toastify";

export interface TimelineItem {
  _id: string;
  date: string;
  imageLink: string;
  description: string;
  cardUrl?: string;
  slotKey?: string;
  section?: "journey" | "setback";
}

type TimelineListResponse = {
  items: TimelineItem[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
};

const PAGE_SIZE = 12;

const SLOT_LABELS: Record<string, string> = {
  journeyHero: "Journey - Hero card",
  journey1Left: "Journey 1 - Left",
  journey1Right: "Journey 1 - Right",
  journey2Left: "Journey 2 - Left",
  journey2Right: "Journey 2 - Right",
  journey3Left: "Journey 3 - Left",
  journey3TopRight: "Journey 3 - Top Right",
  journey3BottomRight: "Journey 3 - Bottom Right",
  setbackMainLeft: "Setback - Main Left",
  setbackMainRight: "Setback - Main Right",
  setbackMosaicLeft: "Setback Mosaic - Left",
  setbackMosaicTopRight: "Setback Mosaic - Top Right",
  setbackMosaicBottomRight: "Setback Mosaic - Bottom Right",
};

const JOURNEY_SLOT_KEYS = [
  "journeyHero",
  "journey1Left",
  "journey1Right",
  "journey2Left",
  "journey2Right",
  "journey3Left",
  "journey3TopRight",
  "journey3BottomRight",
] as const;

const SETBACK_SLOT_KEYS = [
  "setbackMainLeft",
  "setbackMainRight",
  "setbackMosaicLeft",
  "setbackMosaicTopRight",
  "setbackMosaicBottomRight",
] as const;

type JourneySlotKey = (typeof JOURNEY_SLOT_KEYS)[number];
type JourneySlotItems = Partial<Record<JourneySlotKey, TimelineItem>>;
type SetbackSlotKey = (typeof SETBACK_SLOT_KEYS)[number];
type SetbackSlotItems = Partial<Record<SetbackSlotKey, TimelineItem>>;
type SlotMoveDirection = "up" | "down";

function formatTimelineDate(date: string, compact = false) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    day: compact ? undefined : "numeric",
    month: compact ? "short" : "long",
    year: "numeric",
  });
}

function toMonthYear(dateStr: string) {
  const parsed = new Date(dateStr);

  if (Number.isNaN(parsed.getTime())) {
    return { month: "", year: "" };
  }

  return {
    month: parsed.toLocaleString("en-US", { month: "long" }),
    year: parsed.getFullYear().toString(),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const groups: T[][] = [];

  for (let index = 0; index < arr.length; index += size) {
    groups.push(arr.slice(index, index + size));
  }

  return groups;
}

function SequenceButtons({
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  disabled,
  moveUpLabel,
  moveDownLabel,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
}) {
  return (
    <div className='flex flex-col gap-2'>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='h-8 w-8 rounded-full border-white/12 bg-black/55 text-white shadow-none backdrop-blur-sm hover:bg-black/70 hover:text-white'
        onClick={onMoveUp}
        disabled={!canMoveUp || disabled}
        aria-label={moveUpLabel}
      >
        <ArrowUp className='h-4 w-4' />
      </Button>
      <Button
        type='button'
        variant='outline'
        size='icon'
        className='h-8 w-8 rounded-full border-white/12 bg-black/55 text-white shadow-none backdrop-blur-sm hover:bg-black/70 hover:text-white'
        onClick={onMoveDown}
        disabled={!canMoveDown || disabled}
        aria-label={moveDownLabel}
      >
        <ArrowDown className='h-4 w-4' />
      </Button>
    </div>
  );
}

function JourneySlotControls({
  slotKey,
  onMoveSlot,
  isMoving,
}: {
  slotKey: JourneySlotKey;
  onMoveSlot: (slotKey: JourneySlotKey, direction: SlotMoveDirection) => void;
  isMoving: boolean;
}) {
  const index = JOURNEY_SLOT_KEYS.indexOf(slotKey);

  return (
    <div className='absolute left-4 top-4 z-20'>
      <SequenceButtons
        onMoveUp={() => onMoveSlot(slotKey, "up")}
        onMoveDown={() => onMoveSlot(slotKey, "down")}
        canMoveUp={index > 0}
        canMoveDown={index < JOURNEY_SLOT_KEYS.length - 1}
        disabled={isMoving}
        moveUpLabel='Move journey card up'
        moveDownLabel='Move journey card down'
      />
    </div>
  );
}

function SetbackSlotControls({
  slotKey,
  onMoveSlot,
  isMoving,
}: {
  slotKey: SetbackSlotKey;
  onMoveSlot: (slotKey: SetbackSlotKey, direction: SlotMoveDirection) => void;
  isMoving: boolean;
}) {
  const index = SETBACK_SLOT_KEYS.indexOf(slotKey);

  return (
    <div className='absolute left-4 top-4 z-20'>
      <SequenceButtons
        onMoveUp={() => onMoveSlot(slotKey, "up")}
        onMoveDown={() => onMoveSlot(slotKey, "down")}
        canMoveUp={index > 0}
        canMoveDown={index < SETBACK_SLOT_KEYS.length - 1}
        disabled={isMoving}
        moveUpLabel='Move setback card up'
        moveDownLabel='Move setback card down'
      />
    </div>
  );
}

function TimelineMedia({
  item,
  slotLabel,
  className,
}: {
  item?: TimelineItem;
  slotLabel: string;
  className?: string;
}) {
  if (!item?.imageLink) {
    return (
      <div className='flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-border bg-muted/30 px-6 text-center text-muted-foreground'>
        <ImageIcon className='h-10 w-10' />
        <div className='space-y-1'>
          <p className='recoleta text-lg leading-none'>Slot Empty</p>
          <p className='elza text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70'>
            {slotLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={item.imageLink}
      alt={item.description || slotLabel}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

function JourneyHeroPreview({
  item,
  onMoveSlot,
  isMoving,
}: {
  item?: TimelineItem;
  onMoveSlot: (slotKey: JourneySlotKey, direction: "up" | "down") => void;
  isMoving: boolean;
}) {
  const monthYear = item ? toMonthYear(item.date) : null;

  return (
    <section className='mt-10 w-full lg:mt-[60px]'>
      <div className='site-shell mx-auto w-full max-w-6xl'>
        <div className='mx-auto grid w-full max-w-[1080px] grid-cols-[140px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[minmax(240px,360px)_minmax(0,1fr)] md:gap-10'>
          <figure className='relative h-[170px] w-[140px] justify-self-center overflow-hidden rounded-2xl md:h-[300px] md:w-full md:max-w-[360px] md:justify-self-start md:rounded-[26px]'>
            <TimelineMedia item={item} slotLabel={SLOT_LABELS.journeyHero} />
            {item ? (
              <JourneySlotControls
                slotKey='journeyHero'
                onMoveSlot={onMoveSlot}
                isMoving={isMoving}
              />
            ) : null}
            <div className='absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.22)_50%,rgba(0,0,0,.70)_100%)]' />
            {monthYear ? (
              <>
                <div className='absolute right-8 top-6 hidden text-right text-white md:block'>
                  <div className='recoleta text-[42px]'>{monthYear.month}</div>
                  <div className='recoleta text-[34px]'>{monthYear.year}</div>
                </div>
                <figcaption className='elza absolute left-6 right-8 top-6/12 hidden text-right text-[18px] text-white/90 md:block'>
                  {item?.description}
                </figcaption>
              </>
            ) : null}
          </figure>

          <div className='mt-6 max-w-[560px] self-start text-left leading-none lg:mt-0'>
            <h2 className='recoleta text-[36px] leading-none text-[#FFD928] md:text-[96px]'>
              The
              <br />
              Journey
            </h2>
            <p className='recoleta mt-1 text-[20px] text-[#00D8FF] md:text-[40px]'>
              Stories
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function JourneyOnePreview({
  left,
  right,
  onMoveSlot,
  isMoving,
}: {
  left?: TimelineItem;
  right?: TimelineItem;
  onMoveSlot: (slotKey: JourneySlotKey, direction: "up" | "down") => void;
  isMoving: boolean;
}) {
  const leftDate = left ? toMonthYear(left.date) : null;
  const rightDate = right ? toMonthYear(right.date) : null;

  return (
    <section className='mx-auto max-w-6xl px-4'>
      <div className='grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_380px] lg:gap-10'>
        <figure className='relative h-[260px] w-full overflow-hidden rounded-[22px] md:h-[540px] md:rounded-r-[26px] md:rounded-l-none'>
          <TimelineMedia item={left} slotLabel={SLOT_LABELS.journey1Left} />
          {left ? (
            <JourneySlotControls
              slotKey='journey1Left'
              onMoveSlot={onMoveSlot}
              isMoving={isMoving}
            />
          ) : null}
          <div className='absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,.70),rgba(0,0,0,0))]' />
          {leftDate ? (
            <>
              <div className='absolute right-6 bottom-16 text-right leading-[1.05] text-white recoleta'>
                <div className='recoleta text-[28px] md:text-[40px]'>
                  {leftDate.month}
                </div>
                <div className='recoleta text-[28px] md:text-[40px]'>
                  {leftDate.year}
                </div>
              </div>
              <figcaption className='elza absolute left-5 right-6 bottom-5 text-right text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {left?.description}
              </figcaption>
            </>
          ) : null}
        </figure>

        <figure className='relative h-[300px] overflow-hidden rounded-[22px] md:h-80 md:self-end'>
          <TimelineMedia item={right} slotLabel={SLOT_LABELS.journey1Right} />
          {right ? (
            <JourneySlotControls
              slotKey='journey1Right'
              onMoveSlot={onMoveSlot}
              isMoving={isMoving}
            />
          ) : null}
          <div className='absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,.70),rgba(0,0,0,0))]' />
          {rightDate ? (
            <>
              <div className='absolute left-6 bottom-16 leading-[1.05] text-white'>
                <div className='recoleta text-[28px] md:text-[40px]'>
                  {rightDate.month}
                </div>
                <div className='recoleta text-[24px] md:text-[32px]'>
                  {rightDate.year}
                </div>
              </div>
              <figcaption className='elza absolute left-6 right-6 bottom-4 text-left text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {right?.description}
              </figcaption>
            </>
          ) : null}
        </figure>
      </div>
    </section>
  );
}

function JourneyTwoPreview({
  left,
  right,
  onMoveSlot,
  isMoving,
}: {
  left?: TimelineItem;
  right?: TimelineItem;
  onMoveSlot: (slotKey: JourneySlotKey, direction: "up" | "down") => void;
  isMoving: boolean;
}) {
  const leftDate = left ? toMonthYear(left.date) : null;
  const rightDate = right ? toMonthYear(right.date) : null;

  return (
    <section className='mx-auto max-w-6xl px-4 -mt-5 lg:mt-0'>
      <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-10'>
        <figure className='relative h-[260px] overflow-hidden rounded-[22px] sm:h-[420px] md:h-[540px]'>
          <TimelineMedia item={left} slotLabel={SLOT_LABELS.journey2Left} />
          {left ? (
            <JourneySlotControls
              slotKey='journey2Left'
              onMoveSlot={onMoveSlot}
              isMoving={isMoving}
            />
          ) : null}
          <div className='absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,.70),rgba(0,0,0,0))]' />
          {leftDate ? (
            <>
              <div className='absolute right-6 bottom-16 text-right leading-[1.05] text-white recoleta'>
                <div className='text-[28px] sm:text-[40px]'>{leftDate.month}</div>
                <div className='text-[28px] sm:text-[40px]'>{leftDate.year}</div>
              </div>
              <figcaption className='elza absolute left-6 right-6 bottom-5 text-right text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {left?.description}
              </figcaption>
            </>
          ) : null}
        </figure>

        <figure className='relative h-[300px] overflow-hidden rounded-[22px] sm:h-[420px] md:h-[540px]'>
          <TimelineMedia item={right} slotLabel={SLOT_LABELS.journey2Right} />
          {right ? (
            <JourneySlotControls
              slotKey='journey2Right'
              onMoveSlot={onMoveSlot}
              isMoving={isMoving}
            />
          ) : null}
          <div className='absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgba(0,0,0,.70),rgba(0,0,0,0))]' />
          {rightDate ? (
            <>
              <div className='absolute left-6 bottom-16 text-left leading-[1.05] text-white'>
                <div className='recoleta text-[28px] sm:text-[40px]'>
                  {rightDate.month}
                </div>
                <div className='recoleta text-[28px] sm:text-[40px]'>
                  {rightDate.year}
                </div>
              </div>
              <figcaption className='elza absolute left-6 right-6 bottom-5 text-left text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {right?.description}
              </figcaption>
            </>
          ) : null}
        </figure>
      </div>
    </section>
  );
}

function JourneyThreePreview({
  left,
  topRight,
  bottomRight,
  reverse = false,
  onMoveSlot,
  isMoving,
  slotKeys,
}: {
  left?: TimelineItem;
  topRight?: TimelineItem;
  bottomRight?: TimelineItem;
  reverse?: boolean;
  onMoveSlot?: (slotKey: JourneySlotKey, direction: "up" | "down") => void;
  isMoving?: boolean;
  slotKeys?: {
    left?: JourneySlotKey;
    topRight?: JourneySlotKey;
    bottomRight?: JourneySlotKey;
  };
}) {
  const gridCols = reverse
    ? "md:grid-cols-[1fr_1.55fr]"
    : "md:grid-cols-[1.55fr_1fr]";
  const tallOrder = reverse ? "md:order-2" : "md:order-1";
  const stackOrder = reverse ? "md:order-1" : "md:order-2";

  const leftDate = left ? toMonthYear(left.date) : null;
  const topDate = topRight ? toMonthYear(topRight.date) : null;
  const bottomDate = bottomRight ? toMonthYear(bottomRight.date) : null;

  return (
    <section className='relative mx-auto max-w-6xl px-4 -mt-5 lg:mt-0'>
      <div
        className={cn(
          "grid grid-cols-1 items-stretch gap-5 lg:gap-10",
          gridCols
        )}
      >
        <figure
          className={cn(
            "relative h-[260px] overflow-hidden rounded-[22px] md:h-[520px] md:rounded-r-[26px]",
            tallOrder
          )}
        >
          <TimelineMedia item={left} slotLabel={SLOT_LABELS.journey3Left} />
          {left && slotKeys?.left && onMoveSlot ? (
            <JourneySlotControls
              slotKey={slotKeys.left}
              onMoveSlot={onMoveSlot}
              isMoving={Boolean(isMoving)}
            />
          ) : null}
          <div className='absolute inset-0 bg-[radial-gradient(95%_75%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_55%,rgba(0,0,0,.60)_100%)]' />
          {leftDate ? (
            <>
              <figcaption className='elza absolute left-5 right-5 bottom-5 text-right text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {left?.description}
              </figcaption>
              <div className='recoleta absolute right-5 bottom-16 text-right leading-[1.05] text-white'>
                <div className='text-[28px] md:text-[40px]'>{leftDate.month}</div>
                <div className='text-[28px] md:text-[40px]'>{leftDate.year}</div>
              </div>
            </>
          ) : null}
        </figure>

        <div
          className={cn(
            "grid h-[440px] grid-rows-2 gap-5 md:h-[520px] lg:gap-10",
            stackOrder
          )}
        >
          <figure className='relative overflow-hidden rounded-[22px]'>
            <TimelineMedia
              item={topRight}
              slotLabel={SLOT_LABELS.journey3TopRight}
            />
            {topRight && slotKeys?.topRight && onMoveSlot ? (
              <JourneySlotControls
                slotKey={slotKeys.topRight}
                onMoveSlot={onMoveSlot}
                isMoving={Boolean(isMoving)}
              />
            ) : null}
            <div className='absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.22)_50%,rgba(0,0,0,.70)_100%)]' />
            {topDate ? (
              <>
                <div className='recoleta absolute left-5 bottom-16 leading-[1.05] text-white'>
                  <div className='text-[28px] md:text-[40px]'>
                    {topDate.month}
                  </div>
                  <div className='text-[28px] md:text-[40px]'>
                    {topDate.year}
                  </div>
                </div>
                <figcaption className='elza absolute left-5 right-5 bottom-5 text-[12px] leading-5 text-white/90 md:text-[18px]'>
                  {topRight?.description}
                </figcaption>
              </>
            ) : null}
          </figure>

          <figure className='relative overflow-hidden rounded-[22px]'>
            <TimelineMedia
              item={bottomRight}
              slotLabel={SLOT_LABELS.journey3BottomRight}
            />
            {bottomRight && slotKeys?.bottomRight && onMoveSlot ? (
              <JourneySlotControls
                slotKey={slotKeys.bottomRight}
                onMoveSlot={onMoveSlot}
                isMoving={Boolean(isMoving)}
              />
            ) : null}
            <div className='absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.22)_50%,rgba(0,0,0,.70)_100%)]' />
            {bottomDate ? (
              <>
                <div className='recoleta absolute left-5 bottom-16 text-left leading-[1.05] text-white'>
                  <div className='text-[28px] md:text-[40px]'>
                    {bottomDate.month}
                  </div>
                  <div className='text-[28px] md:text-[40px]'>
                    {bottomDate.year}
                  </div>
                </div>
                <figcaption className='elza absolute left-5 right-5 bottom-5 text-[12px] leading-5 text-white/90 md:text-[18px]'>
                  {bottomRight?.description}
                </figcaption>
              </>
            ) : null}
          </figure>
        </div>
      </div>
    </section>
  );
}

function JourneyWebsitePreview({
  slotItems,
  extraItems,
  onMoveSlot,
  isMoving,
}: {
  slotItems: JourneySlotItems;
  extraItems: TimelineItem[];
  onMoveSlot: (slotKey: JourneySlotKey, direction: SlotMoveDirection) => void;
  isMoving: boolean;
}) {
  const extraGroups = chunk(extraItems, 3);

  return (
    <section className='overflow-hidden py-10 md:py-[60px]'>
      <JourneyHeroPreview
        item={slotItems.journeyHero}
        onMoveSlot={onMoveSlot}
        isMoving={isMoving}
      />

      <div className='mt-10 space-y-10'>
        <JourneyOnePreview
          left={slotItems.journey1Left}
          right={slotItems.journey1Right}
          onMoveSlot={onMoveSlot}
          isMoving={isMoving}
        />

        <JourneyTwoPreview
          left={slotItems.journey2Left}
          right={slotItems.journey2Right}
          onMoveSlot={onMoveSlot}
          isMoving={isMoving}
        />

        <JourneyThreePreview
          left={slotItems.journey3Left}
          topRight={slotItems.journey3TopRight}
          bottomRight={slotItems.journey3BottomRight}
          onMoveSlot={onMoveSlot}
          isMoving={isMoving}
          slotKeys={{
            left: "journey3Left",
            topRight: "journey3TopRight",
            bottomRight: "journey3BottomRight",
          }}
        />
      </div>

      {extraGroups.length > 0 ? (
        <section className='mx-auto mt-10 max-w-6xl px-4 space-y-10'>
          {extraGroups.map((group, index) => {
            const [left, topRight, bottomRight] = group;

            return (
              <JourneyThreePreview
                key={group[0]?._id ?? index}
                left={left}
                topRight={topRight}
                bottomRight={bottomRight}
                reverse={index % 2 === 0}
              />
            );
          })}
        </section>
      ) : null}
    </section>
  );
}

function SetbackMainPreview({
  left,
  right,
  onMoveSlot,
  isMoving,
}: {
  left?: TimelineItem;
  right?: TimelineItem;
  onMoveSlot: (slotKey: SetbackSlotKey, direction: SlotMoveDirection) => void;
  isMoving: boolean;
}) {
  const leftDate = left ? toMonthYear(left.date) : null;
  const rightDate = right ? toMonthYear(right.date) : null;

  return (
    <section className='mx-auto max-w-6xl overflow-x-hidden px-6 pt-10 lg:overflow-visible'>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-[440px_minmax(0,1fr)] md:items-start'>
        <div className='flex flex-col gap-3'>
          <h2 className='recoleta text-right text-[30px] text-foreground md:text-[34px]'>
            Setback
          </h2>

          <figure className='relative h-80 overflow-hidden rounded-3xl sm:h-[420px] md:h-[500px]'>
            <TimelineMedia
              item={left}
              slotLabel={SLOT_LABELS.setbackMainLeft}
              className='grayscale'
            />
            {left ? (
              <SetbackSlotControls
                slotKey='setbackMainLeft'
                onMoveSlot={onMoveSlot}
                isMoving={isMoving}
              />
            ) : null}
            <div className='absolute inset-0 bg-[radial-gradient(80%_65%_at_50%_30%,rgba(0,0,0,0)_0%,rgba(0,0,0,.15)_45%,rgba(0,0,0,.55)_100%)]' />
            {leftDate ? (
              <>
                <div className='recoleta absolute right-5 top-[68%] -translate-y-1/2 text-right leading-[1.05] text-white lg:top-[75%]'>
                  <div className='text-[36px]'>{leftDate.month}</div>
                  <div className='text-[40px]'>{leftDate.year}</div>
                </div>

                <figcaption className='elza absolute bottom-5 left-5 right-5 text-right text-[12px] leading-5 text-white/90 md:text-[18px]'>
                  {left?.description}
                </figcaption>
              </>
            ) : null}
          </figure>
        </div>

        <figure className='relative h-[500px] overflow-hidden rounded-[28px] sm:h-[420px] md:h-[564px]'>
          <TimelineMedia
            item={right}
            slotLabel={SLOT_LABELS.setbackMainRight}
            className='grayscale'
          />
          {right ? (
            <SetbackSlotControls
              slotKey='setbackMainRight'
              onMoveSlot={onMoveSlot}
              isMoving={isMoving}
            />
          ) : null}
          <div className='absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_52%,rgba(0,0,0,.60)_100%)]' />
          {rightDate ? (
            <>
              <div className='recoleta absolute left-6 top-[78%] -translate-y-1/2 text-left leading-[1.05] text-white lg:top-[75%]'>
                <div className='text-[36px]'>{rightDate.month}</div>
                <div className='text-[40px]'>{rightDate.year}</div>
              </div>

              <figcaption className='elza absolute bottom-6 left-6 right-6 text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {right?.description}
              </figcaption>
            </>
          ) : null}
        </figure>
      </div>
    </section>
  );
}

function SetbackMosaicPreview({
  left,
  topRight,
  bottomRight,
  reverse = false,
  onMoveSlot,
  isMoving,
  slotKeys,
}: {
  left?: TimelineItem;
  topRight?: TimelineItem;
  bottomRight?: TimelineItem;
  reverse?: boolean;
  onMoveSlot?: (slotKey: SetbackSlotKey, direction: SlotMoveDirection) => void;
  isMoving?: boolean;
  slotKeys?: {
    left?: SetbackSlotKey;
    topRight?: SetbackSlotKey;
    bottomRight?: SetbackSlotKey;
  };
}) {
  const gridCols = reverse
    ? "md:grid-cols-[1fr_1.55fr]"
    : "md:grid-cols-[1.55fr_1fr]";
  const tallOrder = reverse ? "md:order-2" : "md:order-1";
  const stackOrder = reverse ? "md:order-1" : "md:order-2";

  const leftDate = left ? toMonthYear(left.date) : null;
  const topDate = topRight ? toMonthYear(topRight.date) : null;
  const bottomDate = bottomRight ? toMonthYear(bottomRight.date) : null;

  return (
    <section className='mx-auto mt-5 max-w-6xl lg:mt-10'>
      <div
        className={cn(
          "grid grid-cols-1 items-stretch gap-6 md:grid-cols-[1.55fr_1fr]",
          gridCols
        )}
      >
        <figure
          className={cn(
            "relative h-[540px] overflow-hidden rounded-[26px] sm:h-[640px] md:h-[740px]",
            tallOrder
          )}
        >
          <TimelineMedia
            item={left}
            slotLabel={
              slotKeys?.left ? SLOT_LABELS[slotKeys.left] : "Setback - Left"
            }
          />
          {left && slotKeys?.left && onMoveSlot ? (
            <SetbackSlotControls
              slotKey={slotKeys.left}
              onMoveSlot={onMoveSlot}
              isMoving={Boolean(isMoving)}
            />
          ) : null}
          <div className='absolute inset-0 bg-[radial-gradient(95%_75%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_55%,rgba(0,0,0,.55)_100%)]' />
          {leftDate ? (
            <>
              <figcaption className='elza absolute bottom-5 right-5 max-w-sm text-right text-[12px] leading-5 text-white/90 md:text-[18px]'>
                {left?.description}
              </figcaption>
              <div className='recoleta absolute bottom-20 right-5 text-right leading-[1.05] text-white'>
                <div className='text-[32px]'>{leftDate.month}</div>
                <div className='text-[40px]'>{leftDate.year}</div>
              </div>
            </>
          ) : null}
        </figure>

        <div
          className={cn(
            "grid h-[540px] grid-rows-2 gap-6 sm:h-[640px] md:h-[740px]",
            stackOrder
          )}
        >
          <figure className='relative overflow-hidden rounded-[22px]'>
            <TimelineMedia
              item={topRight}
              slotLabel={
                slotKeys?.topRight
                  ? SLOT_LABELS[slotKeys.topRight]
                  : "Setback - Top Right"
              }
            />
            {topRight && slotKeys?.topRight && onMoveSlot ? (
              <SetbackSlotControls
                slotKey={slotKeys.topRight}
                onMoveSlot={onMoveSlot}
                isMoving={Boolean(isMoving)}
              />
            ) : null}
            <div className='absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.22)_50%,rgba(0,0,0,.65)_100%)]' />
            {topDate ? (
              <>
                <div className='recoleta absolute left-5 top-[46%] text-left leading-[1.05] text-white lg:top-[60%]'>
                  <div className='text-[36px]'>{topDate.month}</div>
                  <div className='text-[40px]'>{topDate.year}</div>
                </div>
                <figcaption className='elza absolute bottom-5 left-5 right-5 text-[12px] leading-5 text-white/90 md:text-[18px]'>
                  {topRight?.description}
                </figcaption>
              </>
            ) : null}
          </figure>

          <figure className='relative overflow-hidden rounded-[22px]'>
            <TimelineMedia
              item={bottomRight}
              slotLabel={
                slotKeys?.bottomRight
                  ? SLOT_LABELS[slotKeys.bottomRight]
                  : "Setback - Bottom Right"
              }
            />
            {bottomRight && slotKeys?.bottomRight && onMoveSlot ? (
              <SetbackSlotControls
                slotKey={slotKeys.bottomRight}
                onMoveSlot={onMoveSlot}
                isMoving={Boolean(isMoving)}
              />
            ) : null}
            <div className='absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.22)_50%,rgba(0,0,0,.65)_100%)]' />
            {bottomDate ? (
              <>
                <div className='recoleta absolute left-5 top-[46%] text-left leading-[1.05] text-white lg:top-[60%]'>
                  <div className='text-[36px]'>{bottomDate.month}</div>
                  <div className='text-[40px]'>{bottomDate.year}</div>
                </div>
                <figcaption className='elza absolute bottom-5 left-5 right-5 text-[12px] leading-5 text-white/90 md:text-[18px]'>
                  {bottomRight?.description}
                </figcaption>
              </>
            ) : null}
          </figure>
        </div>
      </div>

      <div>
        <div className='mx-auto mt-[50px] hidden h-0.5 w-[520px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(0,216,255,.9),transparent)] sm:block' />
        <div className='mx-auto mt-[50px] h-0.5 w-[200px] rounded-full bg-[linear-gradient(90deg,transparent,rgba(0,216,255,.9),transparent)] sm:hidden' />
      </div>
    </section>
  );
}

function SetbackWebsitePreview({
  slotItems,
  extraItems,
  onMoveSlot,
  isMoving,
}: {
  slotItems: SetbackSlotItems;
  extraItems: TimelineItem[];
  onMoveSlot: (slotKey: SetbackSlotKey, direction: SlotMoveDirection) => void;
  isMoving: boolean;
}) {
  const extraGroups = chunk(extraItems, 3);

  return (
    <section className='pb-10'>
      <SetbackMainPreview
        left={slotItems.setbackMainLeft}
        right={slotItems.setbackMainRight}
        onMoveSlot={onMoveSlot}
        isMoving={isMoving}
      />

      <div className='px-6'>
        <SetbackMosaicPreview
          left={slotItems.setbackMosaicLeft}
          topRight={slotItems.setbackMosaicTopRight}
          bottomRight={slotItems.setbackMosaicBottomRight}
          onMoveSlot={onMoveSlot}
          isMoving={isMoving}
          slotKeys={{
            left: "setbackMosaicLeft",
            topRight: "setbackMosaicTopRight",
            bottomRight: "setbackMosaicBottomRight",
          }}
        />
      </div>

      {extraGroups.length > 0 ? (
        <section className='mx-auto mt-10 max-w-6xl px-6 space-y-10'>
          {extraGroups.map((group, index) => {
            const [left, topRight, bottomRight] = group;

            return (
              <SetbackMosaicPreview
                key={group[0]?._id ?? index}
                left={left}
                topRight={topRight}
                bottomRight={bottomRight}
                reverse={index % 2 === 0}
              />
            );
          })}
        </section>
      ) : null}
    </section>
  );
}

function TimelineWebsitePreview({
  journeySlotItems,
  journeyExtraItems,
  onMoveJourneySlot,
  isMovingJourney,
  setbackSlotItems,
  setbackExtraItems,
  onMoveSetbackSlot,
  isMovingSetback,
}: {
  journeySlotItems: JourneySlotItems;
  journeyExtraItems: TimelineItem[];
  onMoveJourneySlot: (
    slotKey: JourneySlotKey,
    direction: SlotMoveDirection
  ) => void;
  isMovingJourney: boolean;
  setbackSlotItems: SetbackSlotItems;
  setbackExtraItems: TimelineItem[];
  onMoveSetbackSlot: (
    slotKey: SetbackSlotKey,
    direction: SlotMoveDirection
  ) => void;
  isMovingSetback: boolean;
}) {
  return (
    <div>
      <JourneyWebsitePreview
        slotItems={journeySlotItems}
        extraItems={journeyExtraItems}
        onMoveSlot={onMoveJourneySlot}
        isMoving={isMovingJourney}
      />

      <SetbackWebsitePreview
        slotItems={setbackSlotItems}
        extraItems={setbackExtraItems}
        onMoveSlot={onMoveSetbackSlot}
        isMoving={isMovingSetback}
      />
    </div>
  );
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelinePage, setTimelinePage] = useState<TimelineItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [isReorderingJourney, setIsReorderingJourney] = useState(false);
  const [isReorderingSetback, setIsReorderingSetback] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const askConfirm = (title: string, desc: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmTitle(title);
      setConfirmDesc(desc);
      setConfirmOpen(true);
    });

  const resolveConfirm = (v: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(v);
    confirmResolveRef.current = undefined;
  };

  const loadTimeline = async (pageToLoad = page) => {
    try {
      const [j, allItemsResponse] = await Promise.all([
        apiFetch<TimelineListResponse>(
          withQuery(apiList.timeline.list, {
            page: pageToLoad,
            limit: PAGE_SIZE,
          })
        ),
        apiFetch<{ items: TimelineItem[] }>(apiList.timeline.list),
      ]);
      const pagination = resolvePagination(j, PAGE_SIZE);
      setTimelinePage(j.items || []);
      setTimeline(allItemsResponse.items || []);
      setPage(pagination.page);
      setTotalPages(pagination.pages);
      setTotalItems(pagination.total);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load timeline");
    }
  };

  useEffect(() => {
    void loadTimeline();
  }, []);

  useAdminSync("timeline", () => {
    void loadTimeline(page);
  });

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item: TimelineItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (item: TimelineItem) => {
    const ok = await askConfirm(
      "Delete Timeline Item",
      "Are you sure you want to delete this timeline item?"
    );
    if (!ok) return;

    try {
      await apiFetch(apiList.timeline.delete(item._id), { method: "DELETE" });
      await loadTimeline();
      broadcastAdminSync("timeline");
      toast.success("Timeline item deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete timeline item");
    }
  };

  const handleBulkDelete = async (selectedItems: TimelineItem[]) => {
    const ok = await askConfirm(
      "Delete Timeline Items",
      `Are you sure you want to delete ${selectedItems.length} selected timeline item${
        selectedItems.length === 1 ? "" : "s"
      }?`
    );
    if (!ok) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedItems,
      (item) => apiFetch(apiList.timeline.delete(item._id), { method: "DELETE" })
    );

    await loadTimeline();
    broadcastAdminSync("timeline");

    if (successCount > 0) {
      toast.success(
        `${successCount} timeline item${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(
        errors[0] || `Failed to delete ${failureCount} timeline item(s)`
      );
    }
  };

  const handleSave = async (data: TimelineFormData) => {
    const payload: Partial<TimelineItem> = {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
      slotKey: data.slotKey || undefined,
      cardUrl: data.cardUrl || undefined,
      section: (data.section as TimelineItem["section"]) || undefined,
    };

    try {
      if (editingItem) {
        await apiFetch<{ item: TimelineItem }>(
          apiList.timeline.update(editingItem._id),
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        toast.success("Timeline item updated");
      } else {
        await apiFetch<{ item: TimelineItem }>(apiList.timeline.create, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Timeline item created");
      }

      await loadTimeline();
      broadcastAdminSync("timeline");
      setIsDialogOpen(false);
    } catch (e: any) {
      toast.error(
        e?.message ||
          (editingItem
            ? "Failed to update timeline item"
            : "Failed to create timeline item")
      );
    }
  };

  const handleJourneyMove = async (
    slotKey: JourneySlotKey,
    direction: SlotMoveDirection
  ) => {
    const currentIndex = JOURNEY_SLOT_KEYS.indexOf(slotKey);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= JOURNEY_SLOT_KEYS.length
    ) {
      return;
    }

    const targetSlotKey = JOURNEY_SLOT_KEYS[targetIndex];
    const currentItem = timeline.find((item) => item.slotKey === slotKey);
    const targetItem = timeline.find((item) => item.slotKey === targetSlotKey);

    if (!currentItem) return;

    const previousTimeline = timeline;

    setIsReorderingJourney(true);
    setTimeline((prev) =>
      prev.map((item) => {
        if (item._id === currentItem._id) {
          return { ...item, slotKey: targetSlotKey };
        }

        if (targetItem && item._id === targetItem._id) {
          return { ...item, slotKey };
        }

        return item;
      })
    );

    try {
      const updates = [
        apiFetch(apiList.timeline.update(currentItem._id), {
          method: "PATCH",
          body: JSON.stringify({ slotKey: targetSlotKey }),
        }),
      ];

      if (targetItem) {
        updates.push(
          apiFetch(apiList.timeline.update(targetItem._id), {
            method: "PATCH",
            body: JSON.stringify({ slotKey }),
          })
        );
      }

      await Promise.all(updates);
      await loadTimeline();
      broadcastAdminSync("timeline");
    } catch (e: any) {
      setTimeline(previousTimeline);
      toast.error(e?.message || "Failed to update journey sequence");
    } finally {
      setIsReorderingJourney(false);
    }
  };

  const handleSetbackMove = async (
    slotKey: SetbackSlotKey,
    direction: SlotMoveDirection
  ) => {
    const currentIndex = SETBACK_SLOT_KEYS.indexOf(slotKey);
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= SETBACK_SLOT_KEYS.length
    ) {
      return;
    }

    const targetSlotKey = SETBACK_SLOT_KEYS[targetIndex];
    const currentItem = timeline.find((item) => item.slotKey === slotKey);
    const targetItem = timeline.find((item) => item.slotKey === targetSlotKey);

    if (!currentItem) return;

    const previousTimeline = timeline;

    setIsReorderingSetback(true);
    setTimeline((prev) =>
      prev.map((item) => {
        if (item._id === currentItem._id) {
          return { ...item, slotKey: targetSlotKey };
        }

        if (targetItem && item._id === targetItem._id) {
          return { ...item, slotKey };
        }

        return item;
      })
    );

    try {
      const updates = [
        apiFetch(apiList.timeline.update(currentItem._id), {
          method: "PATCH",
          body: JSON.stringify({ slotKey: targetSlotKey }),
        }),
      ];

      if (targetItem) {
        updates.push(
          apiFetch(apiList.timeline.update(targetItem._id), {
            method: "PATCH",
            body: JSON.stringify({ slotKey }),
          })
        );
      }

      await Promise.all(updates);
      await loadTimeline();
      broadcastAdminSync("timeline");
    } catch (e: any) {
      setTimeline(previousTimeline);
      toast.error(e?.message || "Failed to update setback sequence");
    } finally {
      setIsReorderingSetback(false);
    }
  };

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (item: TimelineItem) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          {formatTimelineDate(item.date)}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (item: TimelineItem) => (
        <span className='block max-w-[34rem] line-clamp-2 text-muted-foreground'>
          {item.description}
        </span>
      ),
    },
    {
      key: "imageLink",
      label: "Image",
      render: () => (
        <div className='flex items-center gap-2'>
          <ImageIcon className='h-4 w-4 text-muted-foreground' />
          <span className='text-xs text-muted-foreground'>Image attached</span>
        </div>
      ),
    },
    {
      key: "slotKey",
      label: "Slot",
      render: (item: TimelineItem) =>
        item.slotKey ? (
          <div className='flex items-center gap-1 text-xs'>
            <Tag className='h-3 w-3 text-muted-foreground' />
            <span>{SLOT_LABELS[item.slotKey] ?? item.slotKey}</span>
          </div>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        ),
    },
    {
      key: "section",
      label: "Section",
      render: (item: TimelineItem) =>
        item.section ? (
          <span className='text-xs capitalize'>{item.section}</span>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        ),
    },
    {
      key: "cardUrl",
      label: "Card URL",
      render: (item: TimelineItem) =>
        item.cardUrl ? (
          <span className='line-clamp-1 text-xs text-blue-600 underline underline-offset-2'>
            {item.cardUrl}
          </span>
        ) : (
          <span className='text-xs text-muted-foreground'>-</span>
        ),
    },
  ];

  const journeySlotItems = useMemo(() => {
    const mapped: JourneySlotItems = {};

    for (const key of JOURNEY_SLOT_KEYS) {
      const match = timeline.find((item) => item.slotKey === key);
      if (match) mapped[key] = match;
    }

    return mapped;
  }, [timeline]);

  const journeyExtraItems = useMemo(
    () =>
      timeline.filter((item) => !item.slotKey && item.section === "journey"),
    [timeline]
  );

  const setbackSlotItems = useMemo(() => {
    const mapped: SetbackSlotItems = {};

    for (const key of SETBACK_SLOT_KEYS) {
      const match = timeline.find((item) => item.slotKey === key);
      if (match) mapped[key] = match;
    }

    return mapped;
  }, [timeline]);

  const setbackExtraItems = useMemo(
    () =>
      timeline.filter((item) => !item.slotKey && item.section === "setback"),
    [timeline]
  );

  return (
    <div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8'>
      <PageHeader
        title='Timeline'
        description='Manage timeline items in list view, then use website view to preview and reorder the About page journey and setback sections.'
      />

      <Tabs defaultValue='list' className='space-y-6'>
        <div className='flex flex-col gap-4'>
          <TabsList>
            <TabsTrigger value='list'>
              <List className='h-4 w-4' />
              List view
            </TabsTrigger>
            <TabsTrigger value='website'>
              <Eye className='h-4 w-4' />
              Website view
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='list' className='space-y-4'>
          <DataTable
            data={timelinePage}
            columns={columns}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            searchPlaceholder='Search timeline...'
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            paginationLabel='timeline items'
            onPageChange={(nextPage) => void loadTimeline(nextPage)}
          />
        </TabsContent>

        <TabsContent value='website' className='space-y-4'>
          <TimelineWebsitePreview
            journeySlotItems={journeySlotItems}
            journeyExtraItems={journeyExtraItems}
            onMoveJourneySlot={handleJourneyMove}
            isMovingJourney={isReorderingJourney}
            setbackSlotItems={setbackSlotItems}
            setbackExtraItems={setbackExtraItems}
            onMoveSetbackSlot={handleSetbackMove}
            isMovingSetback={isReorderingSetback}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-h-[85vh] w-[95vw] overflow-hidden p-0 sm:max-w-2xl'>
          <DialogHeader className='sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur'>
            <DialogTitle>
              {editingItem ? "Edit Timeline Item" : "Add Timeline Item"}
            </DialogTitle>
          </DialogHeader>
          <div className='max-h-[calc(85vh-64px)] overflow-y-auto px-6 py-5'>
            <TimelineForm
              initialData={editingItem || undefined}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) resolveConfirm(false);
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
          </DialogHeader>
          <p className='text-sm text-muted-foreground'>{confirmDesc}</p>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='outline' onClick={() => resolveConfirm(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={() => resolveConfirm(true)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
