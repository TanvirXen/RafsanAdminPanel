"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { runBulkDelete } from "@/lib/bulk-actions";
import { resolvePagination } from "@/lib/pagination";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NOTABLE_EVENT_TYPES,
  NotableEventForm,
} from "@/components/admin/forms/notable-event-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Eye, ImageIcon, List, Star } from "lucide-react";
import { toast } from "react-toastify";

type NotableEventType = (typeof NOTABLE_EVENT_TYPES)[number];

interface NotableEvent {
  _id: string;
  type: NotableEventType;
  date: string;
  imageLink: string;
  description: string;
  title: string;
  featured: boolean;
}

type NotableEventsResponse = {
  events: NotableEvent[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
};

const PAGE_SIZE = 12;

type WebsiteNotableEvent = {
  date: string;
  title: string;
  blurb: string;
  img?: string;
  alt?: string;
};

const DEFAULT_WEBSITE_EVENTS: WebsiteNotableEvent[] = [
  {
    date: "September 12, 2025",
    title: "Annual Charity Gala",
    blurb:
      "From a passionate presenter to a professional host, my journey has been filled with excitement and learning. Discover how I reached this stage.",
    img: "",
    alt: "Annual Charity Gala",
  },
  {
    date: "September 12, 2025",
    title: "Summer Music Festival",
    blurb:
      "From a passionate presenter to a professional host, my journey has been filled with excitement and learning. Discover how I reached this stage.",
    img: "",
    alt: "Summer Music Festival",
  },
];

function formatTableDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function needsReadMore(text: string, limit = 140) {
  return text.trim().length > limit;
}

function truncateText(text: string, limit = 140) {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;

  const cut = trimmed.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

function selectWebsiteEvents(events: NotableEvent[]): WebsiteNotableEvent[] {
  if (!events.length) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((event) => {
      const parsed = new Date(event.date);
      parsed.setHours(0, 0, 0, 0);
      return parsed.getTime() >= today.getTime();
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const selected = upcoming.length
    ? upcoming.slice(0, 2)
    : [...events]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

  return selected.map((event) => ({
    date: formatTableDate(event.date),
    title: event.title,
    blurb: event.description,
    img: event.imageLink,
    alt: event.title,
  }));
}

function NotablePreviewImage({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className: string;
}) {
  return src ? (
    <img src={src} alt={alt} className={className} />
  ) : (
    <div className='flex h-full w-full flex-col items-center justify-center gap-3 bg-black/20 px-6 text-center text-white/70'>
      <ImageIcon className='h-10 w-10' />
      <div className='space-y-1'>
        <p className='recoleta text-lg leading-none'>Image pending</p>
        <p className='elza text-[11px] uppercase tracking-[0.2em] text-white/55'>
          Notable event
        </p>
      </div>
    </div>
  );
}

function CompactEventCard({
  event,
  tone,
  reverse = false,
  onReadMore,
}: {
  event: WebsiteNotableEvent;
  tone: "yellow" | "cyan";
  reverse?: boolean;
  onReadMore: (event: WebsiteNotableEvent) => void;
}) {
  const previewLimit = 140;
  const isLong = needsReadMore(event.blurb, previewLimit);
  const preview = isLong ? truncateText(event.blurb, previewLimit) : event.blurb;
  const panelBg = tone === "yellow" ? "bg-[#FFD928]" : "bg-[#00D8FF]";

  const panel = (
    <div className={`flex items-center px-4 ${panelBg}`}>
      <div className='flex w-full flex-col items-start justify-center gap-2 py-4'>
        <p className='elza text-[11px] leading-4 text-[#121212]/80'>{event.date}</p>
        <h3 className='recoleta text-[15px] font-bold leading-5 text-[#121212]'>
          {event.title}
        </h3>
        <p className='elza text-[11px] leading-4 text-[#121212]/90'>{preview}</p>
        {isLong ? (
          <button
            type='button'
            onClick={() => onReadMore(event)}
            className='elza text-[11px] font-bold text-[#121212] underline underline-offset-2'
          >
            Read more
          </button>
        ) : null}
      </div>
    </div>
  );

  const image = (
    <div className='relative min-h-[15.5rem] overflow-hidden bg-black/20'>
      <NotablePreviewImage
        src={event.img}
        alt={event.alt || event.title}
        className='h-full w-full object-cover'
      />
    </div>
  );

  return (
    <div className='mx-auto grid w-full max-w-[28rem] min-h-[15.5rem] overflow-hidden rounded-[18px] shadow-[0_14px_28px_rgba(0,0,0,.35)] ring-1 ring-white/10 grid-cols-[minmax(0,1.7fr)_minmax(7.25rem,1fr)]'>
      {reverse ? panel : image}
      {reverse ? image : panel}
    </div>
  );
}

function EventFigure({ src, alt }: { src?: string; alt: string }) {
  return (
    <figure className='relative min-h-[20rem] overflow-hidden rounded-[28px] bg-black/20 md:min-h-[22rem] lg:min-h-[28rem] xl:min-h-[33.75rem]'>
      <NotablePreviewImage
        src={src}
        alt={alt}
        className='h-full w-full object-cover'
      />
    </figure>
  );
}

function EventInfoCard({
  tone,
  date,
  title,
  body,
}: {
  tone: "yellow" | "cyan";
  date: string;
  title: string;
  body: string;
}) {
  const background =
    tone === "yellow"
      ? "bg-[#FFD928] text-[#121212]"
      : "bg-[#00D8FF] text-[#121212]";

  return (
    <article
      className={[
        "flex h-full items-center rounded-[28px] p-8 lg:p-10",
        "min-h-[20rem] md:min-h-[22rem] lg:min-h-[28rem] xl:min-h-[33.75rem]",
        background,
      ].join(" ")}
    >
      <div className='max-w-[16rem] space-y-3'>
        <p className='elza text-[15px] leading-6'>{date}</p>
        <h3 className='recoleta text-[24px] font-bold leading-[1.15]'>{title}</h3>
        <p className='elza text-[16px] leading-7'>{body}</p>
      </div>
    </article>
  );
}

function NotableEventsWebsitePreview({
  events,
  onReadMore,
}: {
  events: WebsiteNotableEvent[];
  onReadMore: (event: WebsiteNotableEvent) => void;
}) {
  const listRaw = events.length ? events : DEFAULT_WEBSITE_EVENTS;
  const list = listRaw.slice(0, 2);
  const first = list[0] ?? DEFAULT_WEBSITE_EVENTS[0];
  const second = list[1] ?? list[0] ?? DEFAULT_WEBSITE_EVENTS[1];

  return (
    <section className='overflow-hidden rounded-[32px] bg-[#121212] px-4 py-6 text-white sm:px-6 lg:px-8'>
      <div className='mx-auto flex w-full max-w-[30rem] flex-col items-center gap-4 py-8 md:hidden sm:gap-5'>
        <div className='flex flex-col items-center gap-2 text-center'>
          <h2 className='recoleta text-[28px] font-bold leading-none text-[#FFD928]'>
            Notable Events
          </h2>
          <p className='elza text-[13px] leading-5 text-[#00D8FF]'>
            I have had the privilege to host some fantastic events:
          </p>
        </div>

        <CompactEventCard event={first} tone='yellow' onReadMore={onReadMore} />

        <CompactEventCard
          event={second}
          tone='cyan'
          reverse
          onReadMore={onReadMore}
        />

        <span className='elza inline-flex h-11 items-center justify-center rounded-full border border-[#00D8FF] px-6 text-sm font-bold text-white'>
          Explore more events!
        </span>
      </div>

      <div className='mx-auto hidden w-full max-w-[1100px] py-12 md:block lg:py-14'>
        <header className='mb-10 flex flex-col items-center gap-4'>
          <h2 className='recoleta text-center text-[34px] font-bold leading-[40px] text-[#FFD928] lg:text-[40px] lg:leading-[48px]'>
            Notable Events
          </h2>
          <p className='elza text-center text-[16px] leading-6 text-[#00D8FF]'>
            I have had the privilege to host some fantastic events:
          </p>
        </header>

        <div className='space-y-10'>
          <div className='grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem] md:items-stretch lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]'>
            <EventFigure src={first.img} alt={first.alt || first.title} />
            <EventInfoCard
              tone='yellow'
              date={first.date}
              title={first.title}
              body={first.blurb}
            />
          </div>

          <div className='grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-stretch lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[20rem_minmax(0,1fr)]'>
            <EventInfoCard
              tone='cyan'
              date={second.date}
              title={second.title}
              body={second.blurb}
            />
            <EventFigure src={second.img} alt={second.alt || second.title} />
          </div>
        </div>

        <div className='mt-10 flex justify-center'>
          <span className='elza inline-flex h-12 items-center justify-center rounded-full border border-[#00D8FF] px-6 text-[16px] font-bold text-white'>
            Explore more events!
          </span>
        </div>
      </div>
    </section>
  );
}

export default function NotableEventsPage() {
  const [events, setEvents] = useState<NotableEvent[]>([]);
  const [allEvents, setAllEvents] = useState<NotableEvent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NotableEvent | null>(null);
  const [previewEvent, setPreviewEvent] = useState<WebsiteNotableEvent | null>(
    null
  );
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((value: boolean) => void) | undefined>(
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

  const resolveConfirm = (value: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(value);
    confirmResolveRef.current = undefined;
  };

  const loadEvents = async (pageToLoad = page) => {
    try {
      const [response, fullResponse] = await Promise.all([
        apiFetch<NotableEventsResponse>(
          withQuery(apiList.notableEvents.list, {
            page: pageToLoad,
            limit: PAGE_SIZE,
          })
        ),
        apiFetch<{ events: NotableEvent[] }>(apiList.notableEvents.list),
      ]);
      const pagination = resolvePagination(response, PAGE_SIZE);
      setEvents(response.events || []);
      setAllEvents(fullResponse.events || []);
      setPage(pagination.page);
      setTotalPages(pagination.pages);
      setTotalItems(pagination.total);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load notable events");
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  useAdminSync("notable-events", () => {
    void loadEvents(page);
  });

  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: NotableEvent) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = async (event: NotableEvent) => {
    const confirmed = await askConfirm(
      "Delete Notable Event",
      `Are you sure you want to delete "${event.title}"?`
    );
    if (!confirmed) return;

    try {
      await apiFetch(apiList.notableEvents.delete(event._id), {
        method: "DELETE",
      });
      await loadEvents();
      broadcastAdminSync("notable-events");
      toast.success("Notable event deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete notable event");
    }
  };

  const handleBulkDelete = async (selectedEvents: NotableEvent[]) => {
    const confirmed = await askConfirm(
      "Delete Notable Events",
      `Are you sure you want to delete ${selectedEvents.length} selected notable event${
        selectedEvents.length === 1 ? "" : "s"
      }?`
    );
    if (!confirmed) return false;

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedEvents,
      (event) =>
        apiFetch(apiList.notableEvents.delete(event._id), {
          method: "DELETE",
        })
    );

    await loadEvents();
    broadcastAdminSync("notable-events");

    if (successCount > 0) {
      toast.success(
        `${successCount} notable event${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(
        errors[0] || `Failed to delete ${failureCount} notable event(s)`
      );
    }
  };

  const handleSave = async (data: Partial<NotableEvent>) => {
    const payload = {
      ...data,
      date: data.date ? new Date(data.date).toISOString() : undefined,
    };

    try {
      if (editingEvent) {
        await apiFetch<{ event: NotableEvent }>(
          apiList.notableEvents.update(editingEvent._id),
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        toast.success("Notable event updated");
      } else {
        await apiFetch<{ event: NotableEvent }>(apiList.notableEvents.create, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Notable event created");
      }

      await loadEvents();
      broadcastAdminSync("notable-events");
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(
        error?.message ||
          (editingEvent
            ? "Failed to update notable event"
            : "Failed to create notable event")
      );
    }
  };

  const openPreview = (event: WebsiteNotableEvent) => {
    setPreviewEvent(event);
    setIsPreviewDialogOpen(true);
  };

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (event: NotableEvent) => (
        <div className='space-y-1'>
          <div className='flex items-center gap-2 font-medium'>
            {event.featured ? (
              <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
            ) : null}
            {event.title}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (event: NotableEvent) => (
        <Badge variant='secondary'>{event.type}</Badge>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (event: NotableEvent) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          {formatTableDate(event.date)}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (event: NotableEvent) => (
        <span className='block max-w-[34rem] line-clamp-2 text-muted-foreground'>
          {event.description}
        </span>
      ),
    },
    {
      key: "featured",
      label: "Status",
      render: (event: NotableEvent) =>
        event.featured ? (
          <Badge>Featured</Badge>
        ) : (
          <Badge variant='outline'>Regular</Badge>
        ),
    },
  ];

  const websiteEvents = useMemo(() => selectWebsiteEvents(allEvents), [allEvents]);

  return (
    <div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8'>
      <PageHeader
        title='Notable Events'
        description='Highlight important achievements and preview the homepage notable events section.'
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
            data={events}
            columns={columns}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            searchPlaceholder='Search notable events...'
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            paginationLabel='notable events'
            onPageChange={(nextPage) => void loadEvents(nextPage)}
          />
        </TabsContent>

        <TabsContent value='website' className='space-y-4'>
          <NotableEventsWebsitePreview
            events={websiteEvents}
            onReadMore={openPreview}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-h-[85vh] w-[95vw] overflow-hidden p-0 sm:max-w-2xl'>
          <DialogHeader className='sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur'>
            <DialogTitle>
              {editingEvent ? "Edit Notable Event" : "Add Notable Event"}
            </DialogTitle>
          </DialogHeader>
          <div className='max-h-[calc(85vh-64px)] overflow-y-auto px-6 py-5'>
            <NotableEventForm
              initialData={editingEvent || undefined}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPreviewDialogOpen}
        onOpenChange={(open) => {
          setIsPreviewDialogOpen(open);
          if (!open) setPreviewEvent(null);
        }}
      >
        <DialogContent className='w-[95vw] max-w-[520px] border-white/10 bg-[#121212] p-5 text-white shadow-[0_30px_80px_rgba(0,0,0,.55)]'>
          {previewEvent ? (
            <div>
              <div className='relative mb-4 h-[220px] w-full overflow-hidden rounded-[16px] bg-black/20'>
                <NotablePreviewImage
                  src={previewEvent.img}
                  alt={previewEvent.alt || previewEvent.title}
                  className='h-full w-full object-cover'
                />
                <div
                  aria-hidden
                  className='absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60'
                />
              </div>

              <p className='elza text-[12px] leading-4 text-[#00D8FF]'>
                {previewEvent.date}
              </p>

              <h3 className='recoleta mt-2 text-[20px] font-bold leading-6 text-white'>
                {previewEvent.title}
              </h3>

              <p className='elza mt-3 text-[14px] leading-6 text-white/90'>
                {previewEvent.blurb}
              </p>
            </div>
          ) : null}
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
