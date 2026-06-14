"use client";

import { useEffect, useRef, useState } from "react";
import apiList, { withQuery } from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { runBulkDelete } from "@/lib/bulk-actions";
import { resolvePagination } from "@/lib/pagination";
import { useAuth } from "@/hooks/use-auth";
import { broadcastAdminSync, useAdminSync } from "@/hooks/use-admin-sync";
import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/admin/forms/event-form";
import { Calendar, Grid3x3, List, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import {
  buildSchedulePayload,
  formatScheduleSummary,
  type LegacyOccurrence,
  type RangeDay,
} from "@/lib/event-schedule";

interface Brand {
  _id: string;
  brandName: string;
  imageLink?: string;
  externalLink?: string;
}

interface Event {
  _id: string;
  title: string;
  slug?: string;
  showKey?: string;
  date: string[];
  scheduleMode?: "single" | "range";
  singleDateTime?: string | null;
  rangeStartDate?: string;
  rangeEndDate?: string;
  rangeDays?: RangeDay[];
  venue: string;
  type: "Free" | "Free_with_approval" | "Paid" | "Paid_with_approval";
  description: string;
  imageLinkBg?: string;
  imageLinkOverlay?: string;
  category?: string;
  ticketUrl?: string;
  city?: string;
  country?: string;
  brands?: Array<
    string | { _id: string; brandName: string; imageLink?: string }
  >;
  customFields?: any[];
  occurrences?: LegacyOccurrence[];
}

type EventsResponse = {
  events?: Event[];
  data?: Event[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
};

const PAGE_SIZE = 12;

export default function EventsPage() {
  const { isLoading: authLoading } = useAuth({ redirectOnUnauthed: true });
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((value: boolean) => void) | undefined>(
    undefined
  );

  const askConfirm = (title: string, description: string) =>
    new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmTitle(title);
      setConfirmDesc(description);
      setConfirmOpen(true);
    });

  const resolveConfirm = (value: boolean) => {
    setConfirmOpen(false);
    confirmResolveRef.current?.(value);
    confirmResolveRef.current = undefined;
  };

  const loadData = async (pageToLoad = page) => {
    try {
      const [
        { events: fetchedEvents = [], data: fallbackEvents, ...eventResponse },
        { brands: fetchedBrands = [] },
      ] = await Promise.all([
        apiFetch<EventsResponse>(
          withQuery(apiList.events.list, {
            page: pageToLoad,
            limit: PAGE_SIZE,
          })
        ),
        apiFetch<{ brands: Brand[] }>(apiList.brands.list),
      ]);

      const pagination = resolvePagination(eventResponse, PAGE_SIZE);
      setEvents(fetchedEvents.length ? fetchedEvents : fallbackEvents || []);
      setBrands(fetchedBrands);
      setPage(pagination.page);
      setTotalPages(pagination.pages);
      setTotalEvents(pagination.total);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load events or brands");
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void loadData();
  }, [authLoading]);

  useAdminSync(["events", "brands"], () => {
    if (authLoading) {
      return;
    }

    void loadData(page);
  });

  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = async (event: Event) => {
    const shouldDelete = await askConfirm(
      "Delete Event",
      `Are you sure you want to delete "${event.title}"?`
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await apiFetch(apiList.events.delete(event._id), { method: "DELETE" });
      await loadData();
      broadcastAdminSync("events");
      toast.success("Event deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete event");
    }
  };

  const handleBulkDelete = async (selectedEvents: Event[]) => {
    const shouldDelete = await askConfirm(
      "Delete Events",
      `Are you sure you want to delete ${selectedEvents.length} selected event${
        selectedEvents.length === 1 ? "" : "s"
      }?`
    );

    if (!shouldDelete) {
      return false;
    }

    const { successCount, failureCount, errors } = await runBulkDelete(
      selectedEvents,
      (event) => apiFetch(apiList.events.delete(event._id), { method: "DELETE" })
    );

    await loadData();
    broadcastAdminSync("events");

    if (successCount > 0) {
      toast.success(
        `${successCount} event${successCount === 1 ? "" : "s"} deleted`
      );
    }

    if (failureCount > 0) {
      toast.error(errors[0] || `Failed to delete ${failureCount} event(s)`);
    }
  };

  const handleSave = async (data: any) => {
    const { schedule, ...rest } = data;
    const payload = {
      ...rest,
      ...buildSchedulePayload(schedule),
    };

    try {
      if (editingEvent) {
        await apiFetch<{ event: Event }>(apiList.events.update(editingEvent._id), {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast.success("Event updated");
      } else {
        await apiFetch<{ event: Event }>(apiList.events.create, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Event created");
      }

      await loadData();
      broadcastAdminSync("events");
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(
        error?.message ||
          (editingEvent ? "Failed to update event" : "Failed to create event")
      );
    }
  };

  const getTypeColor = (
    type: Event["type"]
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "Free":
        return "default";
      case "Free_with_approval":
        return "secondary";
      case "Paid":
        return "destructive";
      case "Paid_with_approval":
        return "outline";
      default:
        return "default";
    }
  };

  const columns = [
    {
      key: "title",
      label: "Event Title",
      render: (event: Event) => (
        <div className='space-y-1'>
          <div className='font-medium'>{event.title}</div>
          {event.category === "what_a_show" && event.showKey ? (
            <div className='text-xs text-muted-foreground'>
              Key: <span className='font-mono'>{event.showKey}</span>
            </div>
          ) : null}
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <MapPin className='h-3 w-3' />
            {event.venue}
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      label: "Schedule",
      render: (event: Event) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm'>{formatScheduleSummary(event)}</span>
        </div>
      ),
    },
    {
      key: "category",
      label: "Group",
      render: (event: Event) => (
        <Badge variant='outline'>
          {event.category === "what_a_show" ? "What a Show" : "Other"}
        </Badge>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (event: Event) => (
        <Badge variant={getTypeColor(event.type)}>
          {event.type.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      key: "brands",
      label: "Brands",
      render: (event: Event) => (event.brands ? event.brands.length : 0),
    },
    {
      key: "customFields",
      label: "Form Fields",
      render: (event: Event) =>
        event.customFields ? event.customFields.length : 0,
    },
    {
      key: "description",
      label: "Description",
      render: (event: Event) => (
        <span className='line-clamp-1'>{event.description}</span>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className='p-8'>
        <div className='mb-2 h-6 w-40 animate-pulse rounded bg-muted' />
        <div className='h-4 w-64 animate-pulse rounded bg-muted' />
        <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className='h-28 animate-pulse rounded-lg bg-muted'
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 p-6 lg:p-8'>
      <div className='flex items-center justify-between'>
        <PageHeader
          title='Events'
          description='Manage events, registrations, and attendees'
        />
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("table")}
          >
            <List className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <DataTable
          data={events}
          columns={columns}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          searchPlaceholder='Search events...'
          page={page}
          totalPages={totalPages}
          totalItems={totalEvents}
          paginationLabel='events'
          onPageChange={(nextPage) => void loadData(nextPage)}
        />
      ) : (
        <div className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {events.map((event) => (
              <div key={event._id} className='rounded-lg border p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <div className='text-lg font-semibold'>{event.title}</div>
                    {event.category === "what_a_show" && event.showKey ? (
                      <div className='mt-1 font-mono text-xs text-muted-foreground'>
                        {event.showKey}
                      </div>
                    ) : null}
                    <div className='mt-1 flex items-center gap-2 text-xs text-muted-foreground'>
                      <MapPin className='h-3 w-3' />
                      {event.venue}
                    </div>
                  </div>
                  <Badge variant={getTypeColor(event.type)}>
                    {event.type.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className='mt-3 flex items-center gap-2 text-sm'>
                  <Calendar className='h-4 w-4' />
                  {formatScheduleSummary(event)}
                </div>

                <div className='mt-3'>
                  <Badge variant='outline'>
                    {event.category === "what_a_show" ? "What a Show" : "Other"}
                  </Badge>
                </div>

                <div className='mt-3 text-sm text-muted-foreground line-clamp-3'>
                  {event.description}
                </div>

                <div className='mt-4 flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleEdit(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDelete(event)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            <div className='flex items-center justify-center rounded-lg border border-dashed p-6'>
              <Button variant='ghost' onClick={handleAdd}>
                Add New Event
              </Button>
            </div>
          </div>

          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalItems={totalEvents}
            currentCount={events.length}
            itemLabel='events'
            onPageChange={(nextPage) => void loadData(nextPage)}
          />
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] overflow-hidden p-0 sm:max-w-3xl'>
          <DialogHeader className='sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur'>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>

          <div className='max-h-[calc(90vh-64px)] overflow-y-auto px-6 pb-2 pt-5'>
            <EventForm
              initialData={editingEvent || undefined}
              brands={brands}
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            resolveConfirm(false);
          }
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
