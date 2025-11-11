"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import apiList from "@/apiList";
import { apiFetch } from "@/lib/api-fetch";
import { useAuth } from "@/hooks/use-auth";

import { PageHeader } from "@/components/admin/page-header";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/admin/forms/event-form";
import { Calendar, MapPin, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

interface Brand {
  _id: string;
  brandName: string;
  imageLink?: string;
  externalLink?: string;
}

interface Event {
  _id: string;
  title: string;
  date: string[]; // ISO strings
  venue: string;
  type: "Free" | "Free_with_approval" | "Paid" | "Paid_with_approval";
  description: string;
  imageLinkBg?: string;
  imageLinkOverlay?: string;
  brands?: Array<
    string | { _id: string; brandName: string; imageLink?: string }
  >;
  customFields?: any[];
  occurrences?: Array<{
    date: string; // ISO string
    season?: number;
    episode?: number;
  }>;
}

export default function EventsPage() {
  // Enforce auth + redirect to /login if unauthenticated
  const { isLoading: authLoading } = useAuth({ redirectOnUnauthed: true });

  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // brands master list
  const [brands, setBrands] = useState<Brand[]>([]);

  // ---------- confirm dialog state ----------
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDesc, setConfirmDesc] = useState("");
  const confirmResolveRef = useRef<((v: boolean) => void) | undefined>(
    undefined
  );

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

  // ---------- load ----------
  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const [{ events: evs = [], data: d }, { brands: brs = [] }] =
          await Promise.all([
            apiFetch<{ events?: Event[]; data?: Event[] }>(apiList.events.list),
            apiFetch<{ brands: Brand[] }>(apiList.brands.list),
          ]);
        setEvents(evs?.length ? evs : d || []);
        setBrands(brs);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load events/brands");
      }
    })();
  }, [authLoading]);

  // Resolve associated brand objects for the currently edited event
  const editingEventBrands: Brand[] = useMemo(() => {
    if (!editingEvent?.brands?.length) return [];
    return editingEvent.brands
      .map((b) => {
        if (typeof b === "string") return brands.find((x) => x._id === b);
        const fromId = brands.find((x) => x._id === (b as any)._id);
        return (
          fromId ||
          ({
            _id: (b as any)._id,
            brandName: (b as any).brandName,
            imageLink: (b as any).imageLink,
          } as Brand)
        );
      })
      .filter(Boolean) as Brand[];
  }, [editingEvent, brands]);

  // ---------- CRUD ----------
  const handleAdd = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDelete = async (event: Event) => {
    const ok = await askConfirm(
      "Delete Event",
      `Are you sure you want to delete "${event.title}"?`
    );
    if (!ok) return;
    try {
      await apiFetch(apiList.events.delete(event._id), { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e._id !== event._id));
      toast.success("Event deleted");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete event");
    }
  };

  const handleSave = async (data: Partial<Event>) => {
    const payload = {
      ...data,
      occurrences: data.occurrences?.map((o: any) => ({
        date: new Date(o.date).toISOString(),
        season: o.season || undefined,
        episode: o.episode || undefined,
      })),
      // legacy mirror if you still support it on the backend:
      date: data.occurrences?.map((o: any) => new Date(o.date).toISOString()),
    };

    try {
      if (editingEvent) {
        const j = await apiFetch<{ event: Event }>(
          apiList.events.update(editingEvent._id),
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        setEvents((prev) =>
          prev.map((e) => (e._id === editingEvent._id ? j.event : e))
        );
        toast.success("Event updated");
        setIsDialogOpen(false);
      } else {
        const j = await apiFetch<{ event: Event }>(apiList.events.create, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setEvents((prev) => [j.event, ...prev]);
        toast.success("Event created");
        setIsDialogOpen(false);
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          (editingEvent ? "Failed to update event" : "Failed to create event")
      );
    }
  };

  // ---------- UI helpers ----------
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
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <MapPin className='h-3 w-3' />
            {event.venue}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Date(s)",
      render: (event: Event) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm'>
            {Array.isArray(event.occurrences) && event.occurrences.length
              ? `${event.occurrences.length} dates`
              : event.date?.length
              ? `${event.date.length} dates`
              : "-"}
          </span>
        </div>
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

  // loading skeleton while auth resolves
  if (authLoading) {
    return (
      <div className='p-8'>
        <div className='mb-2 h-6 w-40 animate-pulse rounded bg-muted' />
        <div className='h-4 w-64 animate-pulse rounded bg-muted' />
        <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-28 rounded-lg bg-muted animate-pulse' />
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
          searchPlaceholder='Search events...'
        />
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {events.map((ev) => (
            <div key={ev._id} className='rounded-lg border p-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <div className='text-lg font-semibold'>{ev.title}</div>
                  <div className='mt-1 flex items-center gap-2 text-xs text-muted-foreground'>
                    <MapPin className='h-3 w-3' />
                    {ev.venue}
                  </div>
                </div>
                <Badge variant={getTypeColor(ev.type)}>
                  {ev.type.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className='mt-3 text-sm text-muted-foreground'>
                {ev.description}
              </div>
              <div className='mt-3 flex items-center gap-2 text-sm'>
                <Calendar className='h-4 w-4' />
                {Array.isArray(ev.occurrences) && ev.occurrences.length
                  ? `${ev.occurrences.length} dates`
                  : ev.date?.length
                  ? `${ev.date.length} dates`
                  : "-"}
              </div>
              <div className='mt-4 flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleEdit(ev)}
                >
                  Edit
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleDelete(ev)}
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
      )}

      {/* Form dialog (scrollable) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {/* outer: width + clip overflow */}
        <DialogContent className='w-[95vw] sm:max-w-3xl p-0 overflow-hidden'>
          {/* sticky header stays put */}
          <DialogHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4'>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>

          {/* inner: the ONLY scroll area */}
          <div className='px-6 pt-5 pb-2 max-h-[calc(90vh-64px)] overflow-y-auto'>
            <EventForm
              initialData={editingEvent || undefined}
              brands={brands}
              onBrandsChange={(ids) =>
                setEditingEvent((prev) =>
                  prev ? { ...prev, brands: ids } : prev
                )
              }
              onSave={handleSave}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
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
